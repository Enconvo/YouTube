import { YoutubeTranscript } from "youtube-transcript";

export namespace YoutubeLoader {

    export const load = async ({ url, with_timestamps = true }: {
        url: string,
        with_timestamps?: boolean
    }) => {
        const transcript = await YoutubeTranscript.fetchTranscript(url, {
            lang: "en"
        })

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