import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { toUserMessage } from "../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export class CharacterDescriptionGenerationService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  generateDescription = async (characterName: string): Promise<string> => {
    const messages = this.getChatMessages();
    const prompt = await this.getCharacterDescriptionPrompt(characterName);
    const { model, requestSettings } =
      await this.getCharacterDescriptionModel();

    const promptMessages = buildPromptMessages(messages, prompt);
    const response = await d
      .OpenRouterChatAPI()
      .postChat(promptMessages, model, "chat", "LLM", requestSettings);

    return cleanDescription(response);
  };

  private getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(this.chatId).GetMessages();

  private getCharacterDescriptionPrompt = async (
    characterName: string,
  ): Promise<string> => {
    const basePrompt = await this.fetchCharacterDescriptionPrompt();
    return formatPromptForCharacter(basePrompt, characterName);
  };

  private fetchCharacterDescriptionPrompt = async (): Promise<string> => {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.characterDescriptionPrompt ||
      DEFAULT_SYSTEM_PROMPTS.characterDescriptionPrompt
    );
  };

  private getCharacterDescriptionModel = async (): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> => {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.characterDescriptionModel || undefined,
      requestSettings: systemPrompts?.characterDescriptionRequestSettings,
    };
  };
}

const buildPromptMessages = (
  messages: LLMMessage[],
  prompt: string,
): LLMMessage[] => [...messages, toUserMessage(prompt)];

const formatPromptForCharacter = (
  basePrompt: string,
  characterName: string,
): string =>
  `Generate an appearance-only character sheet for "${characterName}". Focus on stable visual traits and exclude actions, poses, and scene context.\n\n${basePrompt}`;

const cleanDescription = (response: string): string => response.trim();
