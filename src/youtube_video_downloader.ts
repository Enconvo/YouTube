import { RequestOptions, Response, res, uuid, BaseChatMessage, ChatMessageContent, runShellScript, Action, ResponseAction } from "@enconvo/api";
import { homedir } from "os";
import path from "path";
import { unusedFilenameSync } from "unused-filename";
import sanitizeFilename from "sanitize-filename";


interface DownloadVideoOptions extends RequestOptions {
    youtube_url: string,
    output_dir: string,
    audio_only: boolean
}


export default async function main(req: Request): Promise<Response> {
    const options: DownloadVideoOptions = await req.json()
    // Set default output directory to ~/Downloads if not specified or empty
    options.output_dir = options.output_dir?.trim() || `${homedir()}/Downloads`
    // Replace ~ with home directory path
    options.output_dir = options.output_dir.replace(/^~/, homedir())

    const youtubeUrl = options.youtube_url || options.input_text || options.selection_text || options.current_browser_tab?.url
    if (!youtubeUrl) {
        throw new Error("No youtube video to be processed")
    }

    options.youtube_url = youtubeUrl

    const ytDlpVersion = await runShellScript({
        command: 'yt-dlp --version',
        useDefaultEnv: true
    })
    if (ytDlpVersion.code !== 0) {
        console.error('yt-dlp is not installed')

        const installYtDlp = await runShellScript({
            command: 'uv pip install -U "yt-dlp[default]"',
            useDefaultEnv: true
        })

        if (installYtDlp.code !== 0) {
            console.error('Failed to install yt-dlp,', installYtDlp.output)
            throw new Error(`Failed to install yt-dlp  , ${installYtDlp.output}`)
        }
    }

    res.writeLoading('Getting video Info...')
    // Get video title using yt-dlp to use as filename
    const videoTitleResult = await runShellScript({
        command: `yt-dlp --get-title ${options.youtube_url}`,
        useDefaultEnv: true
    });

    console.log('videoTitleResult', videoTitleResult);
    let videoTitle = ''
    if (videoTitleResult.code !== 0) {
        videoTitle = uuid()
    } else {
        videoTitle = videoTitleResult.output.trim()
    }

    // max length 100
    videoTitle = videoTitle.slice(0, 200)

    const downloadFilePath = unusedFilenameSync(path.join(options.output_dir, `${sanitizeFilename(videoTitle)}${options.audio_only ? '.mp3' : '.mp4'}`));

    // download video
    const downloadVideo = await runShellScript({
        // --no-overwrites: Do not overwrite existing files
        command: `yt-dlp -f mp4 -o "${downloadFilePath}" ${options.audio_only ? '-x --audio-format mp3' : ''} ${options.youtube_url}`,
        useDefaultEnv: true,
        onData: (data) => {
            console.log('downloadVideo', data)

            const chunk = data.trim()
            if (chunk) {
                res.writeLoading(chunk)
            }
        }
    })

    if (downloadVideo.code !== 0) {
        console.error('Failed to download video')
        throw new Error(`Failed to download video,${downloadVideo.output}`)
    }



    const actions: ResponseAction[] = [
        Action.Paste({ content: { files: [downloadFilePath] }, closeMainWindow: true }),
        Action.Copy({ content: { files: [downloadFilePath] } }),
        Action.ShowInFinder({ path: downloadFilePath, shortcut: { modifiers: ["cmd"], key: "return" } })
    ]

    return Response.messages(
        [
            BaseChatMessage.assistant([
                ChatMessageContent.video({ url: `file://${downloadFilePath}` })
            ])
        ],
        actions
    )


}


