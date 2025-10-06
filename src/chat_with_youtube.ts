import { Browser, Action, res, RequestOptions, ResponseAction, BaseChatMessage, StringTemplate, UserMessage, LLMProvider, EnconvoResponse } from "@enconvo/api";
import { humanPrompt, summary_template } from "./prompts/prompts.ts";
import { TranscriptLoader } from "./utils/transcript_loader.ts";



let link = '';
let title = '';
let webContent = ''

export default async function main(req: Request): Promise<EnconvoResponse> {
    let query;

    const options: RequestOptions = await req.json()
    const { input_text, selection_text, new_session, history_messages: historyMessages } = options

    query = input_text || selection_text;

    let messages: BaseChatMessage[] = []

    if (new_session) {
        const { messages: newMessages } = await handleNewSession(options)
        messages = newMessages
    } else {
        console.log("query", query, webContent)

        const humanTemplate = new StringTemplate(humanPrompt)
        const userMessagePrompt = humanTemplate.format({ input: query, sources: webContent })

        messages = [...(historyMessages || []), new UserMessage(userMessagePrompt)]
    }
    console.log("messages", JSON.stringify(messages, null, 2))

    const combineModel = await LLMProvider.fromEnv()
    const finalMessage = await combineModel.stream({ messages })

    const response = finalMessage.text


    const actions: ResponseAction[] = [
        Action.Copy({ content: response }),
        Action.Paste({ content: response })
    ]


    return EnconvoResponse.messages([finalMessage], actions)
}


async function handleNewSession(options: RequestOptions) {
    const { question, input_text, selection_text, current_browser_tab, youtube_url } = options
    let query = question || input_text || selection_text || current_browser_tab?.url

    let currentBrowserTab: Browser.BrowserTab | undefined
    const urlRegex = /((http|https):\/\/[^\s]+)/g;
    const isLink = selection_text && urlRegex.test(selection_text);
    if (youtube_url) {
        link = youtube_url
    } else if (isLink) {
        link = selection_text;
    } else {
        const urlRegex = /((http|https):\/\/[^\s]+)/g;
        const match = query && urlRegex.exec(query);
        if (match) {
            link = match[0];
            query = query?.replace(link, "").trim();
        } else if (current_browser_tab?.url) {
            link = current_browser_tab.url
            title = current_browser_tab.title
        } else {
            currentBrowserTab = await Browser.currentTab()
            link = currentBrowserTab?.url || ''
            title = currentBrowserTab?.title || ''
        }
    }

    let isSummarize = false

    if (!query) {
        query = `summarize the link's content, ${link}`;
        isSummarize = true
    }

    if (!link) {
        throw new Error("Unable to get a link")
    }

    res.writeLoading("Loading the subtitles")

    const { transcript } = await TranscriptLoader.load({
        url: link
    })

    webContent = transcript

    console.log("transcript", transcript.slice(0, 100), isSummarize)
    await res.writeLoading("Thinking...")

    const language = options.responseLanguage?.value === 'auto' ? 'use the same language as the input' : `use the language "${options.responseLanguage?.title}"`

    const humanTemplate = new StringTemplate(isSummarize ? summary_template : humanPrompt)
    const userMessagePrompt = humanTemplate.format({ input: query, sources: transcript, language })
    const messages = [new UserMessage(userMessagePrompt)]

    return {
        messages
    }
}

