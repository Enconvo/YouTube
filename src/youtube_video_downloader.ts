import { getPythonEnv, getProjectEnv, RequestOptions, Response, res, uuid, BaseChatMessage, ChatMessageContent } from "@enconvo/api";
import { spawn } from "child_process";
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

    const ytDlpVersion = await runShell({
        command: 'yt-dlp --version',
        useDefaultEnv: true
    })
    if (ytDlpVersion.code !== 0) {
        console.error('yt-dlp is not installed')

        const installYtDlp = await runShell({
            command: 'uv pip install -U "yt-dlp[default]"',
            useDefaultEnv: true
        })

        if (installYtDlp.code !== 0) {
            console.error('Failed to install yt-dlp')
            throw new Error('Failed to install yt-dlp')
        }
    }

    res.writeLoading('Getting video Info...')
    // Get video title using yt-dlp to use as filename
    const videoTitleResult = await runShell({
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

    const downloadFilePath = unusedFilenameSync(path.join(options.output_dir, `${sanitizeFilename(videoTitle)}${options.audio_only ? '.mp3' : '.mp4'}`));

    // download video
    const downloadVideo = await runShell({
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


    return Response.messages([
        BaseChatMessage.assistant([
            ChatMessageContent.video({ url: `file://${downloadFilePath}` })
        ])
    ])


}


export interface RunShellParams {
    command: string,
    useDefaultEnv?: boolean,
    onData?: (data: string) => void,
    onError?: (data: string) => void,
    onPrint?: (data: string) => void
}

export interface RunShellResult {
    code: number,
    output: string
}

export const runShell = async (params: RunShellParams): Promise<RunShellResult> => {
    /**
 * set venv
 */
    const venvPath = await getPythonEnv({ useDefaultEnv: params.useDefaultEnv || false })
    console.log('venvPath1', venvPath);
    let sourceVenv = ''
    if (venvPath) {
        sourceVenv = `source .venv/bin/activate && `
    }
    /**
     * set project path
     */
    const projectPath = getProjectEnv({ useDefaultEnv: params.useDefaultEnv || false })


    const command = `${sourceVenv} ${params.command}`;
    console.log('command', command);

    const child = spawn("/bin/bash", ['-c', command], {
        cwd: projectPath
    });

    let output = '';
    child.stdout.on('data', async (data) => {
        const chunk = data.toString();
        console.log("data:", chunk);
        output += chunk;
        params.onData?.(chunk)
        params.onPrint?.(chunk)
    });

    child.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.log("error data:", chunk);
        console.error(chunk);
        output += chunk;
        params.onError?.(chunk)
        params.onPrint?.(chunk)
    });


    const result = await new Promise<{ code: number, output: string }>((resolve, reject) => {
        child.on('close', (code) => {
            resolve({
                code: code || 0,
                output
            });
        });
    });


    return result
}

