import { Browser, Action, res, language, RequestOptions, EnconvoResponse, ChatMessageContentSearchResultList, AssistantMessage, ChatMessageContentLoadingIndicator, ResponseAction, BaseChatMessage, StringTemplate, UserMessage, LLMProvider } from "@enconvo/api";
import { humanPrompt, summary_template } from "./prompts.ts";
import { YoutubeLoader } from "./youtube_loader.ts";



let link = '';
let title = '';
let webContent = ''

export default async function main(req: Request): Promise<EnconvoResponse> {
    let query;

    const options: RequestOptions = await req.json()
    const { input_text, selection_text, new_session, history_messages: historyMessages } = options

    query = input_text || selection_text;

    let messages: BaseChatMessage[] = []
    let resultItemsMessage: ChatMessageContentSearchResultList = new ChatMessageContentSearchResultList([])

    if (new_session) {
        const { messages: newMessages, resultItemsMessage: newResultItemsMessage } = await handleNewSession(options)
        messages = newMessages
        resultItemsMessage = newResultItemsMessage
    } else {
        let LANGUAGE = "auto"
        console.log("query", query, webContent)

        const humanTemplate = new StringTemplate(humanPrompt)
        const userMessagePrompt = humanTemplate.format({ LANGUAGE, input: query, sources: webContent })

        messages = [...historyMessages, new UserMessage(userMessagePrompt)]
    }

    const combineModel = await LLMProvider.fromEnv()
    const finalMessage = await combineModel.stream({ messages, autoHandle: true })

    const response = finalMessage.text()


    const actions: ResponseAction[] = [
        Action.Copy({ content: response }),
        Action.Paste({ content: response })
    ]


    return {
        type: "messages",
        messages: [new AssistantMessage([
            {
                type: "text",
                text: response
            },
            resultItemsMessage
        ])],
        actions
    }
}


async function handleNewSession(options: RequestOptions) {
    const { input_text, selection_text, current_browser_tab } = options
    let query = input_text || selection_text || current_browser_tab?.url

    let currentBrowserTab: Browser.BrowserTab | undefined
    const urlRegex = /((http|https):\/\/[^\s]+)/g;
    const isLink = selection_text && urlRegex.test(selection_text);
    if (isLink) {
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
            link = currentBrowserTab?.url
            title = currentBrowserTab?.title
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

    const url = new URL(link)
    const host = url.host
    const item = {
        title: title || link,
        user: host,
        url: link,
        icon: `https://www.google.com/s2/favicons?domain=${link}&sz=${128}`
    }

    const items = [item]

    let resultItemsMessage = new ChatMessageContentSearchResultList(items)

    const loadingMessage = new ChatMessageContentLoadingIndicator("Browsing the " + title)

    res.write({
        content: new AssistantMessage([
            resultItemsMessage,
            loadingMessage
        ]),
        action: res.WriteAction.OverwriteLastMessageAllContent,
    })

    webContent = await YoutubeLoader.load({
        url: link
    })

    let LANGUAGE = "english"

    if (options.responseLanguage?.value === "auto") {
        const detectContent = isSummarize ? webContent.slice(0, 100) : query
        LANGUAGE = await language.detect(detectContent)
    } else {
        LANGUAGE = options.responseLanguage?.title
    }

    console.log("language", LANGUAGE, options.responseLanguage, webContent)

    await res.writeLoading("Thinking...")

    const humanTemplate = new StringTemplate(isSummarize ? summary_template : humanPrompt)
    const userMessagePrompt = humanTemplate.format({ LANGUAGE, input: query, sources: webContent })
    const messages = [new UserMessage(userMessagePrompt)]

    return {
        messages,
        resultItemsMessage
    }
}

