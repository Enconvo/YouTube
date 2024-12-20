import { Action, EnconvoResponse, Exporter, RequestOptions, ResponseAction } from "@enconvo/api";
import { YoutubeTranscript } from 'youtube-transcript';
import fs from "fs";

interface Params extends RequestOptions {
    with_timestamps: boolean;
}


export default async function main(req: Request): Promise<EnconvoResponse> {
    const options: Params = await req.json();

    const { input_text, selection_text } = options;

    let inputText = input_text || selection_text;


    if (!inputText) {
        throw new Error("No youtube video to be processed")
    }

    const transcript = await YoutubeTranscript.fetchTranscript(inputText,{
        lang: "en"
    })
    const result = transcript.reduce((acc, t, index) => {
        const startTime = new Date(t.offset).toISOString().substr(11, 12).replace('.', ',');
        const endTime = new Date(t.offset + t.duration).toISOString().substr(11, 12).replace('.', ',');
        const srtEntry = options.with_timestamps
            ? `${index + 1}\n${startTime} --> ${endTime}\n${t.text}\n\n`
            : `${t.text}\n\n`;
        return acc + srtEntry;
    }, '').trim();


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

    const output: EnconvoResponse = {
        type: "text",
        content: result,
        actions: actions
    }


    return output;
}

