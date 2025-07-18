import { Action, Exporter, RequestOptions, ResponseAction, res, EnconvoResponse } from "@enconvo/api";
import fs from "fs";
import { TranscriptLoader } from "./utils/transcript_loader.ts";

interface Params extends RequestOptions {
    with_timestamps: boolean;
    language: string | {
        value: string;
    };
}

export default async function main(req: Request): Promise<Response> {
    const options: Params = await req.json();

    const { youtube_url, input_text, selection_text, current_browser_tab } = options;
    console.log({ youtube_url, input_text, selection_text, current_browser_tab })

    let inputText = youtube_url || input_text || selection_text || current_browser_tab?.url;

    if (!inputText) {
        throw new Error("No youtube video to be processed")
    }

    res.writeLoading('Getting transcript...')
    const result = await TranscriptLoader.load({
        url: inputText,
        with_timestamps: options.with_timestamps,
        language: typeof options.language === "string" ? options.language : options.language.value
    })


    const saveAsFileAction: ResponseAction = {
        title: `Save As ${options.with_timestamps ? "SRT" : "TXT"}`,
        icon: "sf:headphones.circle",
        shortcut: { key: "t", modifiers: ["cmd"] },
        onAction: async () => {
            const destination = await Exporter.showSavePanel({
                title: "Save Transcript",
                nameFieldStringValue: `Untitled.${options.with_timestamps ? "srt" : "txt"}`,
            });

            if (destination) {
                fs.writeFileSync(destination, result);
            }

        }
    }

    const actions: ResponseAction[] = [
        Action.Paste({ content: result }),
        saveAsFileAction,
        Action.Copy({ content: result })
    ]

    const truncateText = (text: string): string => {
        if (text.length <= 1000) return text;
        return text.slice(0, 500) + text.slice(-500) + `\n\n **result truncated, use [Copy] or [Paste] or [Save As ${options.with_timestamps ? "SRT" : "TXT"}] action to get full result**`;
    };

    const showResult = options.runType === "agent" ? result : truncateText(result);
    const output: EnconvoResponse = {
        type: "text",
        content: showResult,
        actions: actions
    }


    return output;
}
