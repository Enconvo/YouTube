import { RequestOptions, res, ChatMessageContent, Action, ResponseAction, EnconvoResponse, FileUtil, BrowserTabContextItem, NativeAPI } from "@enconvo/api";
import { homedir } from "os";
import path from "path";
import { unusedFilenameSync } from "unused-filename";
import sanitizeFilename from "sanitize-filename";
import { runProjectShellScript } from "./utils/python_utils.ts";
import { getVideoInfo } from "./utils/video.ts";
import { setTimeout } from "timers";


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

    let youtubeUrl = options.video_url || options.input_text
    if (!youtubeUrl) {

        youtubeUrl = options.context_items?.find((item) => item.type === 'browserTab')?.url
        console.log("context_items youtubeUrl", youtubeUrl)
        if (!youtubeUrl) {
            const resp = await NativeAPI.callCommand('browser_context|get_browser_current_tab_url')
            const { items } = resp.data as { items: BrowserTabContextItem[] }
            if (items.length > 0) {
                youtubeUrl = items[0].url
                console.log("get_browser_current_tab_url youtubeUrl", youtubeUrl)
            } else {
                throw new Error("Unable to get youtube url")
            }
        }
    }

    options.video_url = youtubeUrl
    res.writeLoading('Getting video info...')

    const useCookieCommand = options.use_cookies ? `--cookies-from-browser ${options.browser_type.value}` : ''
    const videoInfo = await getVideoInfo(options.video_url, useCookieCommand)

    console.log("videoInfo", videoInfo)


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
    const versionCommand = `yt-dlp --version`
    console.log("versionCommand", versionCommand)
    const versionResult = await runProjectShellScript({
        command: versionCommand,
        activeVenv: true,
    })
    console.log("versionResult", versionResult)
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


    if (!options.audio_only && (options.video_url.includes('facebook.com') || options.video_url.includes('instagram.com')) && options.force_convert_to_compatible_mp4) {
        const tempFilePath = FileUtil.createTempFilePath({
            extension: 'mp4'
        })
        // console.log("tempFilePath", tempFilePath)
        setTimeout(async () => {
            res.writeLoading('Converting to compatible mp4...')
        }, 500)
        const convertToMp4Command = `ffmpeg -i "${downloadFilePath}" -c:v libx264 -c:a aac -movflags +faststart "${tempFilePath}"`
        const convertToMp4 = await runProjectShellScript({
            command: convertToMp4Command,
            activeVenv: true,
        })
        // console.log("convertToMp4", convertToMp4)

        if (convertToMp4.code === 0) {
            // Move temp file to replace original
            console.time("moveCommand")
            const moveCommand = `mv "${tempFilePath}" "${downloadFilePath}"`
            await runProjectShellScript({
                command: moveCommand,
                activeVenv: true,
            })
            console.timeEnd("moveCommand")
        }
    }

    const actions: ResponseAction[] = [
        Action.Paste({ content: { files: [downloadFilePath] }, closeMainWindow: true }),
        Action.Copy({ content: { files: [downloadFilePath] } }),
        Action.ShowInFinder({ path: downloadFilePath, shortcut: { modifiers: ["cmd"], key: "return" } })
    ]

    return EnconvoResponse.content(
        [
            ChatMessageContent.video({ url: `${downloadFilePath}` })
        ],
        false,
        actions
    )


}


