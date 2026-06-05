import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { StoryChatMessage } from "../../../services/CQRS/UserChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { DiscussionConfig } from "./DiscussionConfig";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

/**
 * Creates a DiscussionConfig for discussing the story.
 * When the user clicks "Generate", the story is regenerated
 * using the conversation as feedback, then updated via
 * ChatService.EditStory.
 */
export const createStoryDiscussionConfig = (
  chatId: string,
  discussStoryPrompt?: string,
): DiscussionConfig => {
  const findStory = (): StoryChatMessage | undefined =>
    d
      .UserChatProjection(chatId)
      .GetMessages()
      .find((m) => m.type === "story") as StoryChatMessage | undefined;

  const getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(chatId).GetMessages();

  const resolvedDiscussionPrompt = (): string =>
    discussStoryPrompt || DEFAULT_SYSTEM_PROMPTS.discussStoryPrompt;

  const buildSystemPrompt = (): string => {
    const story = findStory();
    const content = story?.content ?? "";

    const lines = [`# Story Discussion`, ``, resolvedDiscussionPrompt()];

    if (content) {
      lines.push(``, `Current story:`, `---`, content, `---`);
    }

    return lines.join("\n");
  };

  const getDefaultModel = (): string | undefined => undefined;

  const buildInitialPrompt = (): string =>
    DEFAULT_SYSTEM_PROMPTS.newStoryPrompt;

  const generateFromFeedback = async (
    feedback: string,
    modelOverride?: string,
    requestSettingsOverride?: OpenRouterRequestSettings,
  ): Promise<void> => {
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

    const response = await d
      .OpenRouterChatAPI()
      .postChat(messages, modelOverride, "chat", "LLM", requestSettingsOverride);

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
