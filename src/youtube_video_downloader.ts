import { RequestOptions, Response, res, uuid, BaseChatMessage, ChatMessageContent, runShellScript, Action, ResponseAction } from "@enconvo/api";
import { homedir } from "os";
import path from "path";
import { unusedFilenameSync } from "unused-filename";
import sanitizeFilename from "sanitize-filename";


interface DownloadVideoOptions extends RequestOptions {
    video_url: string,
    output_dir: string,
    audio_only: boolean,
    favorite_resolution: string | {
        value: "1080" | "720" | "480" | "360" | "240" | "144"
    },
    use_cookies: boolean,
    browser_type: {
        value: string
    }
}


export default async function main(req: Request): Promise<Response> {
    const options: DownloadVideoOptions = await req.json()
    // Set default output directory to ~/Downloads if not specified or empty
    options.output_dir = options.output_dir?.trim() || `${homedir()}/Downloads`
    // Replace ~ with home directory path
    options.output_dir = options.output_dir.replace(/^~/, homedir())

    const youtubeUrl = options.video_url || options.input_text || options.selection_text || options.current_browser_tab?.url
    if (!youtubeUrl) {
        throw new Error("No youtube video to be processed")
    }

    options.video_url = youtubeUrl


    const useCookieCommand = options.use_cookies ? `--cookies-from-browser ${options.browser_type.value}` : ''

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
        command: `yt-dlp ${useCookieCommand} --get-title  ${options.video_url}`,
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

    const favoriteResolution = typeof options.favorite_resolution === 'string' ? options.favorite_resolution : options.favorite_resolution.value
    const favoriteResolutionNumber = parseInt(favoriteResolution)
    // Set format code to ensure mp4 format
    const isYoutube = options.video_url.includes('youtube.com')
    const formatCode = isYoutube ? `bestvideo[ext=mp4][height<=${favoriteResolutionNumber}]+bestaudio[ext=m4a]/best[ext=mp4][height<=${favoriteResolutionNumber}]` : 'mp4'
    console.log('formatCode', formatCode)

    // Set download file path with .mp4 extension
    const downloadFilePath = unusedFilenameSync(path.join(options.output_dir, `${sanitizeFilename(videoTitle)}.mp4`));

    // Download video with specified format code
    const command = `yt-dlp  ${useCookieCommand} -f '${formatCode}' -o "${downloadFilePath}"  ${options.video_url}`
    console.log('command', command)
    const downloadVideo = await runShellScript({
        // --no-overwrites: Do not overwrite existing files
        // Set the resolution to 720p by specifying the format code 'bestvideo[height<=720]+bestaudio/best[height<=720]'
        command: command,
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


