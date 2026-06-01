import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { toUserMessage } from "../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export class CharacterSelectionService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  selectCharacterForImage = async (): Promise<string | null> => {
    const messages = this.getChatMessages();
    const prompt = await this.getCharacterSelectionPrompt();
    const { model, requestSettings } = await this.getCharacterSelectionModel();

    const promptMessages = buildPromptMessages(messages, prompt);
    const response = await d
      .OpenRouterChatAPI()
      .postChat(promptMessages, model, "chat", "LLM", requestSettings);

    return parseCharacterName(response);
  };

  private getChatMessages = (): LLMMessage[] =>
    d.LLMChatProjection(this.chatId).GetMessages();

  private getCharacterSelectionPrompt = async (): Promise<string> => {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.characterSelectionPrompt ||
      DEFAULT_SYSTEM_PROMPTS.characterSelectionPrompt
    );
  };

  private getCharacterSelectionModel = async (): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> => {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model:
        systemPrompts?.characterSelectionModel ||
        DEFAULT_SYSTEM_PROMPTS.characterSelectionModel ||
        undefined,
      requestSettings: systemPrompts?.characterSelectionRequestSettings,
    };
  };
}

const buildPromptMessages = (
  messages: LLMMessage[],
  prompt: string,
): LLMMessage[] => [...messages, toUserMessage(prompt)];

const parseCharacterName = (response: string): string | null => {
  const cleaned = cleanResponse(response);

  if (isUnclearResponse(cleaned)) {
    return null;
  }

  return cleaned;
};

const cleanResponse = (response: string): string =>
  response.trim().replace(/^["']|["']$/g, "");

const isUnclearResponse = (response: string): boolean =>
  response.toUpperCase() === "UNCLEAR" || response.length === 0;
