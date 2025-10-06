import { RequestOptions, EnconvoResponse, Commander, TranscriptContextItem } from "@enconvo/api";
import { TranscriptLoader } from "./utils/transcript_loader.ts";

interface Params extends RequestOptions {
    url?: string;
    title?: string;
    load_content?: boolean;
    with_timestamps: boolean;
    language: string | {
        value: string;
    };
}

let isLoading = false

export default async function main(req: Request): Promise<EnconvoResponse> {
    // if (isLoading) {
    //     return EnconvoResponse.json({
    //         isLoading: true
    //     })
    // }
    // isLoading = true

    const options: Params = await req.json();

    let youtube_url: string = options.url || ""
    let youtube_title: string = options.title || ""
    if (!youtube_url || youtube_url.length === 0) {
        const resp = await Commander.send("getDocumentUrl")
        youtube_url = resp.data?.url
        youtube_title = resp.data?.title
    }
    if (!youtube_url || youtube_url.length === 0) {
        return {
            error: "No youtube url found"
        }
    }

    try {
        let transcript: string | undefined = undefined
        if (options.load_content) {
            const result = await TranscriptLoader.load({
                url: youtube_url,
                with_timestamps: options.with_timestamps
            })
            transcript = result.transcript
        }

        const context: TranscriptContextItem = {
            type: "transcript",
            title: youtube_title,
            icon: `https://www.google.com/s2/favicons?domain=${youtube_url}&sz=128`,
            url: youtube_url,
            content: transcript,
            source: "contextAwareness",
            commandKey: "youtube|get_youtube_transcript",
            status: options.loadContent ? "content_loaded" : "content_unloaded"
        }

        return EnconvoResponse.json({
            items: [context]
        })
    } catch (error) {
        console.error("error", error)
        return EnconvoResponse.json({
            items: []
        })
    } finally {
        isLoading = false
    }
}
