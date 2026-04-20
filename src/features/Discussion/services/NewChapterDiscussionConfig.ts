import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * Creates a DiscussionConfig for discussing a new chapter's summary BEFORE
 * the chapter is created. All messages are still visible in the LLM context
 * since no chapter event has been persisted yet.
 *
 * When the user clicks "Generate", the summary is generated from the
 * conversation feedback and the chapter is created in one shot via
 * ChatService.AddChapter.
 */
export const createNewChapterDiscussionConfig = (
  chatId: string,
  chapterTitle: string,
  chapterSummaryModel?: string,
  chapterSummaryPrompt?: string,
): DiscussionConfig => {
  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const resolvedPrompt = (): string =>
    chapterSummaryPrompt || DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt;

  const buildSystemPrompt = (): string => {
    const lines = [
      `# New Chapter Summary Discussion — ${chapterTitle}`,
      ``,
      `You are helping the user create a summary for a new chapter.`,
      `Consider the full chat history above for context.`,
      ``,
      `The chapter does not have a summary yet. Help the user create one.`,
      `Engage in a helpful conversation about what happened in this chapter.`,
      `Suggest improvements, ask clarifying questions, and help them refine the summary.`,
      `Keep responses concise and focused on accurately capturing the chapter's events.`,
    ];

    return lines.join("\n");
  };

  const buildInitialPrompt = (): string => resolvedPrompt();

  const getDefaultModel = (): string | undefined =>
    chapterSummaryModel || undefined;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const chatMessages = getChatMessages();
    const systemPrompt = [
      resolvedPrompt(),
      ``,
      `Chapter title: ${chapterTitle}`,
      ``,
      `The user discussed the following about what the summary should contain:`,
      `---`,
      feedback,
      `---`,
      ``,
      `Generate a chapter summary incorporating the user's feedback.`,
      `Keep the summary to about a paragraph. Provide your summary directly without formatting or a preamble.`,
    ].join("\n");

    const messages: LLMMessage[] = [
      ...chatMessages,
      { role: "system", content: systemPrompt },
    ];

    const model = chapterSummaryModel || undefined;
    const summary = await d.OpenRouterChatAPI().postChat(messages, model);

    await d.ChatService(chatId).AddChapter(chapterTitle, summary);
  };

  const acceptMessage = async (content: string): Promise<void> => {
    await d.ChatService(chatId).AddChapter(chapterTitle, content);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
    buildInitialPrompt,
    acceptMessage,
  };
};
