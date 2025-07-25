import { getVideoInfo, SubtitleInfo } from "./video.ts"
import axios from "axios"

export namespace TranscriptLoader {

    export const load = async ({ url, with_timestamps = true, language = 'auto' }: {
        url: string,
        with_timestamps?: boolean
        language?: string
    }) => {

        console.log("url", url, language)

        const videoInfo = await getVideoInfo(url)
        let subTitleInfo: SubtitleInfo | undefined
        let languageCode = 'en'
        const ext = with_timestamps ? 'srt' : 'json3'
        if (language === 'auto') {
            const subtitles = Object.entries(videoInfo.subtitles)
            if (subtitles.length > 0) {
                const [language, captions] = subtitles[0]
                subTitleInfo = captions.find(caption => caption.ext === ext)
                languageCode = language
            } else {
                const enCaptions = videoInfo.automatic_captions["en"]
                if (enCaptions) {
                    subTitleInfo = enCaptions.find(caption => caption.ext === ext)
                    languageCode = 'en'
                } else {
                    const automatic_captions = Object.entries(videoInfo.automatic_captions)
                    if (automatic_captions.length > 0) {
                        const [language, captions] = automatic_captions[0]
                        subTitleInfo = captions.find(caption => caption.ext === ext)
                        languageCode = language
                    }
                }
            }
        } else {
            const subtitles = videoInfo.subtitles[language]
            if (subtitles) {
                subTitleInfo = subtitles.find(caption => caption.ext === ext)
                languageCode = language
            } else {
                const enCaptions = videoInfo.automatic_captions[language]
                if (enCaptions) {
                    subTitleInfo = enCaptions.find(caption => caption.ext === ext)
                    languageCode = language
                }
            }
        }
        console.log("subTitleInfo", subTitleInfo)

        if (!subTitleInfo) {
            throw new Error(`No subtitle found`)
        }

        // Use axios to fetch the subtitle content
        const response = await axios.get(subTitleInfo.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Mode': 'navigate',
            }
        })

        let text = response.data
        if (with_timestamps) {
            return {
                transcript: text,
                language: languageCode,
                title: videoInfo.title,
                description: videoInfo.description
            }
        }


        const jsonData: {
            events: {
                tStartMs: number
                dDurationMs: number
                segs: {
                    utf8: string
                }[]
                wpWinPosId: number
            }[]
        } = text

        const events = jsonData.events
        const eventsWithoutTimestamps = events.map(event => {
            return event.segs.map(seg => {
                return seg.utf8
            }).join(' ')
        }).join('\n')

        return {
            transcript: eventsWithoutTimestamps,
            language: languageCode,
            title: videoInfo.title,
            description: videoInfo.description
        }
    }


}