import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { StoryChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * Creates a DiscussionConfig for discussing the story.
 * When the user clicks "Generate", the story is regenerated
 * using the conversation as feedback, then updated via
 * ChatService.EditStory.
 */
export const createStoryDiscussionConfig = (
  chatId: string,
): DiscussionConfig => {
  const findStory = (): StoryChatMessage | undefined =>
    d
      .UserChatProjection(chatId)
      .GetMessages()
      .find((m) => m.type === "story") as StoryChatMessage | undefined;

  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const buildSystemPrompt = (): string => {
    const story = findStory();
    const content = story?.content ?? "";

    const lines = [
      `# Story Discussion`,
      ``,
      `You are helping the user discuss and refine their story.`,
      `Consider the full chat history above for context.`,
    ];

    if (content) {
      lines.push(``, `This is the current story:`, `---`, content, `---`);
    }

    lines.push(
      ``,
      `The user would like to discuss what the story should contain.`,
      `Engage in a helpful, creative conversation about the story.`,
      `Suggest ideas, ask clarifying questions, and help them refine their vision.`,
      `Keep responses concise and focused on making the story compelling.`,
    );

    return lines.join("\n");
  };

  const getDefaultModel = (): string | undefined => undefined;

  const buildInitialPrompt = (): string =>
    DEFAULT_SYSTEM_PROMPTS.newStoryPrompt;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const story = findStory();
    if (!story) return;

    const currentContent = story.content ?? "";

    const chatMessages = getChatMessages();
    const systemPrompt = [
      `Review the conversation above and generate an updated story.`,
      ``,
      `Current story:`,
      `---`,
      currentContent,
      `---`,
      ``,
      `The user discussed the following changes:`,
      `---`,
      feedback,
      `---`,
      ``,
      `Generate an updated story incorporating the user's feedback.`,
      `Maintain the story's tone and style while applying the requested changes.`,
      `Provide the story directly without formatting or a preamble.`,
    ].join("\n");

    const messages: LLMMessage[] = [
      ...chatMessages,
      { role: "system", content: systemPrompt },
    ];

    const response = await d.OpenRouterChatAPI().postChat(messages);

    await d.ChatService(chatId).EditStory(story.id, response);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
    buildInitialPrompt,
  };
};
