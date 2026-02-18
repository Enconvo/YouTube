import { homedir } from "os"
import { runProjectPythonScript } from "./python_utils.ts"

export interface SubtitleInfo {
    url: string, // Caption file URL
    ext: string, // File extension (e.g., "vtt", "srt", "json3")
    protocol?: string, // Protocol type (e.g., "m3u8_native")
    name?: string, // Language name (e.g., "English (United States)")
    __yt_dlp_client?: string, // YouTube DLP client identifier
}
export interface VideoInfo {
    id: string,
    title: string,
    formats: {
        format_note: string,
        format_id: string,
        url: string,
        ext: string,
    }[],
    thumbnails: {
        url: string, // Thumbnail image URL
        preference: number, // Preference score for ordering thumbnails
        id: string, // Thumbnail identifier
        height?: number, // Optional thumbnail height in pixels
        width?: number, // Optional thumbnail width in pixels
        resolution?: string, // Optional resolution string (e.g., "1920x1080")
    }[], // Array of available thumbnail images

    automatic_captions: {
        [key: string]: SubtitleInfo[]
    },
    subtitles: {
        [key: string]: SubtitleInfo[]
    },

    description: string, // Video description text
    thumbnail: string, // Thumbnail image URL
    duration: number, // Video duration in seconds
    channel_id: string, // YouTube channel ID
    channel_url: string, // YouTube channel URL
    view_count: number, // Number of views
    average_rating: number | null, // Average rating (can be null)
    age_limit: number, // Age restriction limit
    webpage_url: string, // Original video webpage URL
    categories: string[], // Video categories array
    format_note: string, // Format description note
    format_id: string, // Format identifier
    ext: string, // File extension
    // Video engagement metrics
    comment_count: number, // Number of comments on the video
    like_count: number, // Number of likes on the video

    // Chapter and heatmap data
    chapters: any | null, // Video chapters information (can be null)
    heatmap: any | null, // Video heatmap data (can be null)

    // Channel and uploader information
    channel: string, // Channel name
    channel_follower_count: number, // Number of channel followers
    uploader: string, // Uploader name
    uploader_id: string, // Uploader ID (e.g., "@username")
    uploader_url: string, // Uploader profile URL

    // Upload and timing information
    upload_date: string, // Upload date in YYYYMMDD format
    timestamp: number, // Upload timestamp in seconds
    availability: string, // Video availability status (e.g., "public")

    // URL and metadata
    original_url: string, // Original video URL
    webpage_url_basename: string, // Base name of the webpage URL
    webpage_url_domain: string, // Domain of the webpage URL
    extractor: string, // Extractor used (e.g., "youtube")
    extractor_key: string, // Extractor key identifier

    // Playlist information
    playlist: any | null, // Playlist information (can be null)
    playlist_index: any | null, // Index in playlist (can be null)

    // Display and title information
    display_id: string, // Display ID of the video
    fulltitle: string, // Full title of the video
    duration_string: string, // Duration in human-readable format (e.g., "2:16")

    // Release and live status
    release_year: any | null, // Release year (can be null)
    is_live: boolean, // Whether the video is currently live
    was_live: boolean, // Whether the video was previously live

    // Subtitle and DRM information
    requested_subtitles: any | null, // Requested subtitle information (can be null)
    _has_drm: any | null, // Internal DRM flag (can be null)

    // Additional metadata
    epoch: number, // Epoch timestamp
    asr: number, // Audio sample rate
    filesize: number, // File size in bytes
    source_preference: number, // Source preference score
    fps: number, // Frames per second
    audio_channels: number, // Number of audio channels
    height: number, // Video height in pixels
    quality: number, // Quality score
    has_drm: boolean, // Whether content has DRM protection
    tbr: number, // Total bitrate
    filesize_approx: number, // Approximate file size

    // Video stream URL
    url: string, // Direct video stream URL
    width: number, // Video width in pixels

    // Language preferences
    language: string, // Video language code
    language_preference: number, // Language preference score
    preference: any | null, // General preference (can be null)

    // Codec information
    vcodec: string, // Video codec (e.g., "avc1.42001E")
    acodec: string, // Audio codec (e.g., "mp4a.40.2")
    dynamic_range: string, // Dynamic range (e.g., "SDR")

    // Download configuration
    downloader_options: {
        http_chunk_size: number, // HTTP chunk size for downloading
    },
    protocol: string, // Protocol used (e.g., "https")

    // File extensions
    video_ext: string, // Video file extension
    audio_ext: string, // Audio file extension

    // Bitrate information
    vbr: any | null, // Video bitrate (can be null)
    abr: any | null, // Audio bitrate (can be null)

    // Display properties
    resolution: string, // Video resolution string (e.g., "640x360")
    aspect_ratio: number, // Video aspect ratio

    // HTTP headers for requests
    http_headers: {
        "User-Agent": string, // User agent string
        "Accept": string, // Accept header
        "Accept-Language": string, // Accept language header
        "Sec-Fetch-Mode": string, // Security fetch mode
    },

    // Format description
    format: string, // Full format description string

}

export async function getVideoInfo(url: string, useCookieCommand: string): Promise<VideoInfo> {

    const result = await runProjectPythonScript({
        pythonFile: 'extract_link.py',
        params: [url, useCookieCommand],
    })
    console.log("result", result)
    if (result.code !== 0) {
        console.error('Failed to extract video info', result)
        throw new Error(`Failed to extract video info, ${result.output}`)
    }
    // require('fs').writeFileSync(`${homedir()}/Downloads/result.json`, result.output)

    let videoInfo: VideoInfo
    try {
        videoInfo = JSON.parse(result.output)
    } catch (e) {
        console.error('Failed to parse video info', result)
        throw new Error(`Failed to parse video info, ${result.output}`)
    }

    return videoInfo
}