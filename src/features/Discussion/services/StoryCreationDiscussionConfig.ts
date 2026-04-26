import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * DiscussionConfig for the story creation wizard.
 * Works without an existing chatId — there is no prior chat context.
 * When the user accepts or generates, the story is passed to onStoryGenerated.
 */
export const createStoryCreationDiscussionConfig = (
  onStoryGenerated: (story: string) => void,
): DiscussionConfig => {
  const getChatMessages = (): LLMMessage[] => [];

  const buildSystemPrompt = (): string =>
    [
      `You are a creative writing assistant helping the user design a new story.`,
      `Discuss what kind of story they want: characters, setting, tone, and premise.`,
      `Ask clarifying questions and offer creative suggestions.`,
      `When asked to generate the story context, produce a vivid, engaging opening that captures the world and characters.`,
    ].join("\n");

  const getDefaultModel = (): string | undefined => undefined;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const systemPrompt = [
      `You are a creative writing assistant.`,
      `Based on the following discussion, generate a rich story context (world, characters, setting, and premise).`,
      `Provide the story context directly without preamble or meta-commentary.`,
      ``,
      `Discussion:`,
      `---`,
      feedback,
      `---`,
    ].join("\n");

    try {
      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
      ];
      const story = await d.OpenRouterChatAPI().postChat(messages);
      onStoryGenerated(story);
    } catch (error) {
      d.ErrorService().log("Failed to generate story from discussion", error);
    }
  };

  const acceptMessage = async (content: string): Promise<void> => {
    onStoryGenerated(content);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
    acceptMessage,
  };
};
