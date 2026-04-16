import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { BookChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * Creates a DiscussionConfig for discussing a specific book's summary.
 * When the user clicks "Generate", the book summary is regenerated
 * using the conversation as feedback, then the book is updated via
 * ChatService.EditBook.
 */
export const createBookDiscussionConfig = (
  chatId: string,
  bookId: string,
): DiscussionConfig => {
  const findBook = (): BookChatMessage | undefined =>
    d
      .UserChatProjection(chatId)
      .GetMessages()
      .find((m) => m.id === bookId) as BookChatMessage | undefined;

  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const buildSystemPrompt = (): string => {
    const book = findBook();
    if (!book) return "";

    const title = book.data?.title ?? "Untitled Book";
    const summary = book.content ?? "";

    const lines = [
      `# Book Summary Discussion — ${title}`,
      ``,
      `You are helping the user discuss and refine the summary for this book.`,
      `Consider the full chat history above for context.`,
    ];

    if (summary) {
      lines.push(
        ``,
        `This is the current book summary:`,
        `---`,
        summary,
        `---`,
      );
    }

    lines.push(
      ``,
      `The user would like to discuss what the book summary should contain.`,
      `Engage in a helpful conversation about the overarching narrative.`,
      `Suggest improvements, ask clarifying questions, and help them refine the summary.`,
      `Keep responses concise and focused on the book's narrative arc and themes.`,
    );

    return lines.join("\n");
  };

  const getDefaultModel = (): string | undefined => undefined;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const book = findBook();
    if (!book) return;

    const title = book.data?.title ?? "";
    const currentSummary = book.content ?? "";

    const chatMessages = getChatMessages();
    const systemPrompt = [
      `Review the conversation above and generate an updated book summary.`,
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

    const response = await d.OpenRouterChatAPI().postChat(messages);

    await d.ChatService(chatId).EditBook(bookId, title, response);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
  };
};
