import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ChapterChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * Creates a DiscussionConfig for discussing a specific chapter's summary.
 * When the user clicks "Generate", the chapter summary is regenerated
 * using the conversation as feedback, then the chapter is updated via
 * ChatService.EditChapter.
 *
 * @param chapterSummaryModel - Model override from SystemPrompts for chapter summary generation
 * @param chapterSummaryPrompt - Prompt from SystemPrompts for chapter summary generation
 */
export const createChapterDiscussionConfig = (
  chatId: string,
  chapterId: string,
  chapterSummaryModel?: string,
  chapterSummaryPrompt?: string,
): DiscussionConfig => {
  const findChapter = (): ChapterChatMessage | undefined =>
    d
      .UserChatProjection(chatId)
      .GetMessages()
      .find((m) => m.id === chapterId) as ChapterChatMessage | undefined;

  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const resolvedPrompt = (): string =>
    chapterSummaryPrompt || DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt;

  const buildSystemPrompt = (): string => {
    const chapter = findChapter();
    if (!chapter) return "";

    const title = chapter.data?.title ?? "Untitled Chapter";
    const summary = chapter.content ?? "";

    const lines = [
      `# Chapter Summary Discussion — ${title}`,
      ``,
      `You are helping the user create and refine the summary for this chapter.`,
      `Consider the full chat history above for context.`,
    ];

    if (summary) {
      lines.push(
        ``,
        `This is the current chapter summary:`,
        `---`,
        summary,
        `---`,
      );
    }

    lines.push(
      ``,
      summary
        ? `The user would like to discuss what the chapter summary should contain.`
        : `The chapter does not have a summary yet. Help the user create one.`,
      `Engage in a helpful conversation about what happened in this chapter.`,
      `Suggest improvements, ask clarifying questions, and help them refine the summary.`,
      `Keep responses concise and focused on accurately capturing the chapter's events.`,
    );

    return lines.join("\n");
  };

  const buildInitialPrompt = (): string => resolvedPrompt();

  const getDefaultModel = (): string | undefined =>
    chapterSummaryModel || undefined;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const chapter = findChapter();
    if (!chapter) return;

    const title = chapter.data?.title ?? "";
    const currentSummary = chapter.content ?? "";

    const chatMessages = getChatMessages();
    const systemPrompt = [
      resolvedPrompt(),
      ``,
      `Current chapter title: ${title}`,
      `Current summary:`,
      `---`,
      currentSummary,
      `---`,
      ``,
      `The user discussed the following changes:`,
      `---`,
      feedback,
      `---`,
      ``,
      `Generate an updated chapter summary incorporating the user's feedback.`,
      `Keep the summary to about a paragraph. Provide your summary directly without formatting or a preamble.`,
    ].join("\n");

    const messages: LLMMessage[] = [
      ...chatMessages,
      { role: "system", content: systemPrompt },
    ];

    const model = chapterSummaryModel || undefined;
    const response = await d.OpenRouterChatAPI().postChat(messages, model);

    await d.ChatService(chatId).EditChapter(chapterId, title, response);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
    buildInitialPrompt,
  };
};
