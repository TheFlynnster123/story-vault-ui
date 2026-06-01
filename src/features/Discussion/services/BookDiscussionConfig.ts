import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { BookChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

/**
 * Creates a DiscussionConfig for discussing a specific book's summary.
 * When the user clicks "Generate", the book summary is regenerated
 * using the conversation as feedback, then the book is updated via
 * ChatService.EditBook.
 *
 * @param bookSummaryModel - Model override from SystemPrompts for book summary generation
 * @param bookSummaryPrompt - Prompt from SystemPrompts for book summary generation
 * @param discussBookPrompt - Prompt from SystemPrompts for book discussion
 */
export const createBookDiscussionConfig = (
  chatId: string,
  bookId: string,
  bookSummaryModel?: string,
  bookSummaryRequestSettings?: OpenRouterRequestSettings,
  bookSummaryPrompt?: string,
  discussBookPrompt?: string,
): DiscussionConfig => {
  const findBook = (): BookChatMessage | undefined =>
    d
      .UserChatProjection(chatId)
      .GetMessages()
      .find((m) => m.id === bookId) as BookChatMessage | undefined;

  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const resolvedPrompt = (): string =>
    bookSummaryPrompt || DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt;

  const resolvedDiscussionPrompt = (): string =>
    discussBookPrompt || DEFAULT_SYSTEM_PROMPTS.discussBookPrompt;

  const buildSystemPrompt = (): string => {
    const book = findBook();
    if (!book) return "";

    const title = book.data?.title ?? "Untitled Book";
    const summary = book.content ?? "";

    const lines = [
      `# Book Summary Discussion — ${title}`,
      ``,
      resolvedDiscussionPrompt(),
    ];

    if (summary) {
      lines.push(``, `Current book summary:`, `---`, summary, `---`);
    }

    return lines.join("\n");
  };

  const buildInitialPrompt = (): string => resolvedPrompt();

  const getDefaultModel = (): string | undefined =>
    bookSummaryModel || undefined;

  const getDefaultRequestSettings = (): OpenRouterRequestSettings | undefined =>
    bookSummaryRequestSettings;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const book = findBook();
    if (!book) return;

    const title = book.data?.title ?? "";
    const currentSummary = book.content ?? "";

    const chatMessages = getChatMessages();
    const systemPrompt = [
      resolvedPrompt(),
      ``,
      `Current book title: ${title}`,
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
      `Generate an updated book summary incorporating the user's feedback.`,
      `Focus on the overarching narrative arc, major character developments, and key plot points.`,
      `Keep the summary to 2-3 paragraphs. Provide your summary directly without formatting or a preamble.`,
    ].join("\n");

    const messages: LLMMessage[] = [
      ...chatMessages,
      { role: "system", content: systemPrompt },
    ];

    const model = bookSummaryModel || undefined;
    const response = await d
      .OpenRouterChatAPI()
      .postChat(messages, model, "chat", "LLM", bookSummaryRequestSettings);

    await d.ChatService(chatId).EditBook(bookId, title, response);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    getDefaultRequestSettings,
    generateFromFeedback,
    buildInitialPrompt,
  };
};
