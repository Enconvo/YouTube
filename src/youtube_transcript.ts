import { RequestOptions, EnconvoResponse, Commander } from "@enconvo/api";
import { TranscriptLoader } from "./utils/transcript_loader.ts";

interface Params extends RequestOptions {
    with_timestamps: boolean;
}


export default async function main(req: Request): Promise<EnconvoResponse> {

    const options: Params = await req.json();
    console.log("get youtube transcript options", options)

    let youtube_url: string = ""
    let youtube_title: string = ""
    const resp = await Commander.send("getDocumentUrl")
    console.log("getDocumentUrl response", resp)
    youtube_url = resp.data?.url
    youtube_title = resp.data?.title
    if (!youtube_url || youtube_url.length === 0) {
        return {
            error: "No youtube url found"
        }
    }

    try {
        let transcript: string | undefined = undefined
        const result = await TranscriptLoader.load({
            url: youtube_url,
            with_timestamps: options.with_timestamps
        })
        transcript = result.transcript

        const context = {
            title: youtube_title,
            url: youtube_url,
            content: transcript,
        }

        return EnconvoResponse.json(context)
    } catch (error) {
        console.error("error", error)
        return EnconvoResponse.json({
            error: error
        })
    } finally {
    }
}
