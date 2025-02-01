import { TranscriptConfig, YoutubeTranscript } from "youtube-transcript";

export namespace YoutubeLoader {

    export const load = async ({ url, with_timestamps = true, language }: {
        url: string,
        with_timestamps?: boolean
        language?: string
    }) => {

        let config: TranscriptConfig | undefined = {
            lang: language
        }

        if (language === "auto") {
            config = undefined
        }

        const transcript = await YoutubeTranscript.fetchTranscript(url, config)

        const result = transcript.reduce((acc, t, index) => {
            const startTime = new Date(t.offset).toISOString().substr(11, 12).replace('.', ',');
            const endTime = new Date(t.offset + t.duration).toISOString().substr(11, 12).replace('.', ',');
            const srtEntry = with_timestamps
                ? `${index + 1}\n${startTime} --> ${endTime}\n${t.text}\n\n`
                : `${t.text}\n\n`;
            return acc + srtEntry;
        }, '').trim();

        return result
    }


}