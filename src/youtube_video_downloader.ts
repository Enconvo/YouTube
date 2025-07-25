import { RequestOptions, res, ChatMessageContent, Action, ResponseAction, EnconvoResponse } from "@enconvo/api";
import { homedir } from "os";
import path from "path";
import { unusedFilenameSync } from "unused-filename";
import sanitizeFilename from "sanitize-filename";
import { runProjectShellScript } from "./utils/python_utils.ts";
import { getVideoInfo } from "./utils/video.ts";


interface DownloadVideoOptions extends RequestOptions {
    video_url: string,
    output_dir: string,
    audio_only: boolean,
    favorite_resolution: string | {
        value: "best" | "1080" | "720" | "480" | "360" | "240" | "144"
    },
    use_cookies: boolean,
    browser_type: {
        value: string
    }
}


export default async function main(req: Request): Promise<EnconvoResponse> {

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
    res.writeLoading('Getting video info...')

    const videoInfo = await getVideoInfo(options.video_url)

    const useCookieCommand = options.use_cookies ? `--cookies-from-browser ${options.browser_type.value}` : ''

    let videoTitle = videoInfo.id

    videoTitle = sanitizeFilename(videoTitle)

    const favoriteResolution = typeof options.favorite_resolution === 'string' ? options.favorite_resolution : options.favorite_resolution.value

    // Prioritize downloading videos with format_note matching favoriteResolution
    // --merge-output-format mp4 --recode-video mp4
    // Build format selector based on favorite resolution preference
    // Build format selector to ensure MP4 output format
    // Prioritize H.264 video codec with AAC audio for maximum compatibility
    const formatCode = options.audio_only ? `-f ba[ext=m4a]/ba[acodec^=mp3]/ba/b` : favoriteResolution === 'best'
        ? '-f bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/bv*[ext=mp4]+ba/b[ext=mp4]/b'
        : `-f bv*[vcodec^=avc1][format_note*=${favoriteResolution}][ext=mp4]+ba[ext=m4a]/bv*[format_note*=${favoriteResolution}][ext=mp4]+ba/bv*[ext=mp4]+ba/b[ext=mp4]/b`

    // Set download file path with .mp4 extension
    const downloadFileName = path.join(options.output_dir, `${videoTitle}`)
    const downloadFilePath = unusedFilenameSync(downloadFileName + `${options.audio_only ? '.mp3' : '.mp4'}`);

    // Build yt-dlp command with QuickTime-compatible encoding
    // --postprocessor-args: Force H.264 video and AAC audio encoding for QuickTime compatibility
    const command = `yt-dlp ${useCookieCommand} ${formatCode} ${options.audio_only ? '--audio-format mp3' : '--recode-video mp4'}  -o "${downloadFilePath}" ${options.video_url}`
    console.log("command", command)
    const downloadVideo = await runProjectShellScript({
        command: command,
        activeVenv: true,
        onData: (data) => {
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

    return EnconvoResponse.content(
        [
            ChatMessageContent.video({ url: `file://${downloadFilePath}` })
        ],
        false,
        actions
    )


}


