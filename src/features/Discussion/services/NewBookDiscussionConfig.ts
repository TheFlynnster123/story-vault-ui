import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ChapterChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

/**
 * Creates a DiscussionConfig for discussing a new book's summary BEFORE
 * the book is created. The selected chapter summaries are the source context,
 * and the final action creates the book in one shot via ChatService.AddBook.
 */
export const createNewBookDiscussionConfig = (
  chatId: string,
  bookTitle: string,
  chapterIds: string[],
  bookSummaryModel?: string,
  bookSummaryRequestSettings?: OpenRouterRequestSettings,
  bookSummaryPrompt?: string,
  discussBookPrompt?: string,
): DiscussionConfig => {
  const getSelectedChapters = (): ChapterChatMessage[] => {
    const selectedIds = new Set(chapterIds);
    return d
      .UserChatProjection(chatId)
      .GetMessages()
      .filter(
        (m) => m.type === "chapter" && selectedIds.has(m.id),
      ) as ChapterChatMessage[];
  };

  const buildChapterSummariesContent = (): string =>
    getSelectedChapters()
      .map((chapter, index) => {
        const title = chapter.data?.title ?? `Chapter ${index + 1}`;
        const summary = chapter.content || "No summary available.";
        return `Chapter ${index + 1}: ${title}\n${summary}`;
      })
      .join("\n\n");

  const getChatMessages = (): LLMMessage[] => {
    const summariesContent = buildChapterSummariesContent();
    if (!summariesContent) return [];

    return [
      {
        role: "system",
        content: `# Selected Chapter Summaries\n${summariesContent}`,
      },
    ];
  };

  const resolvedPrompt = (): string =>
    bookSummaryPrompt || DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt;

  const resolvedDiscussionPrompt = (): string =>
    discussBookPrompt || DEFAULT_SYSTEM_PROMPTS.discussBookPrompt;

  const buildSystemPrompt = (): string => {
    const lines = [
      `# New Book Summary Discussion — ${bookTitle}`,
      ``,
      `This book does not have a summary yet.`,
      ``,
      resolvedDiscussionPrompt(),
    ];

    return lines.join("\n");
  };

  const buildInitialPrompt = (): string => resolvedPrompt();

  const getDefaultModel = (): string | undefined =>
    bookSummaryModel || undefined;

  const getDefaultRequestSettings = (): OpenRouterRequestSettings | undefined =>
    bookSummaryRequestSettings;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const chapterSummariesContent = buildChapterSummariesContent();
    if (!chapterSummariesContent) return;

    const systemPrompt = [
      resolvedPrompt(),
      ``,
      `Book title: ${bookTitle}`,
      ``,
      `Selected chapter summaries:`,
      `---`,
      chapterSummariesContent,
      `---`,
      ``,
      `The user discussed the following about what the summary should contain:`,
      `---`,
      feedback,
      `---`,
      ``,
      `Generate a book summary incorporating the user's feedback.`,
      `Focus on the overarching narrative arc, major character developments, and key plot points.`,
      `Keep the summary to 2-3 paragraphs. Provide your summary directly without formatting or a preamble.`,
    ].join("\n");

    const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

    const model = bookSummaryModel || undefined;
    const summary = await d
      .OpenRouterChatAPI()
      .postChat(messages, model, "chat", "LLM", bookSummaryRequestSettings);

    await d.ChatService(chatId).AddBook(bookTitle, summary, chapterIds);
  };

  const acceptMessage = async (content: string): Promise<void> => {
    await d.ChatService(chatId).AddBook(bookTitle, content, chapterIds);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    getDefaultRequestSettings,
    generateFromFeedback,
    buildInitialPrompt,
    acceptMessage,
  };
};
