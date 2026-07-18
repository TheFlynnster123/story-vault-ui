import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../services/Utils/MessageUtils";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { CharacterDescription } from "./CharacterDescription";
import { normalizeSheetItems } from "./CharacterDescription";

export interface CharacterSheetUpdate {
  characterId: string;
  sheetItems: string[];
}

const CHARACTER_SHEET_UPDATE_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "character_sheet_updates",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["characters"],
      properties: {
        characters: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "items"],
            properties: {
              id: { type: "string" },
              items: {
                type: "array",
                maxItems: 10,
                items: { type: "string", maxLength: 240 },
              },
            },
          },
        },
      },
    },
  },
};

export class CharacterSheetSyncService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async synchronize(
    characters: CharacterDescription[],
  ): Promise<CharacterSheetUpdate[]> {
    if (characters.length === 0) return [];

    const contextMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildGenerationRequestMessages(false);
    const settings = await this.getPromptSettings();
    const response = await d
      .OpenRouterChatAPI()
      .postStructuredChat<unknown>(
        buildCharacterSheetUpdateMessages(
          contextMessages,
          settings.prompt,
          characters,
        ),
        CHARACTER_SHEET_UPDATE_RESPONSE_FORMAT,
        settings.model,
        "Character Sheet Sync",
        false,
        settings.requestSettings,
        "chat",
      );

    return normalizeCharacterSheetUpdates(response, characters);
  }

  private async getPromptSettings(): Promise<{
    prompt: string;
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const prompts = await d.SystemPromptsService().Get();
    return {
      prompt:
        prompts?.characterSheetUpdatePrompt ||
        DEFAULT_SYSTEM_PROMPTS.characterSheetUpdatePrompt,
      model:
        prompts?.characterSheetUpdateModel ||
        prompts?.characterSheetModel ||
        DEFAULT_SYSTEM_PROMPTS.characterSheetUpdateModel ||
        undefined,
      requestSettings:
        prompts?.characterSheetUpdateRequestSettings ??
        prompts?.characterSheetRequestSettings,
    };
  }
}

const buildCharacterSheetUpdateMessages = (
  contextMessages: LLMMessage[],
  prompt: string,
  characters: CharacterDescription[],
): LLMMessage[] => [
  ...contextMessages,
  toSystemMessage(prompt),
  toUserMessage(
    [
      "Return every requested character exactly once in the configured JSON object.",
      JSON.stringify({
        characters: characters.map((character) => ({
          id: character.id,
          name: character.name,
          currentItems: character.sheetItems,
        })),
      }),
    ].join("\n\n"),
  ),
];

const normalizeCharacterSheetUpdates = (
  response: unknown,
  requestedCharacters: CharacterDescription[],
): CharacterSheetUpdate[] => {
  if (!response || typeof response !== "object") {
    throw new Error("Character Sheet Sync returned no structured response.");
  }

  const entries = (response as { characters?: unknown }).characters;
  if (!Array.isArray(entries)) {
    throw new Error("Character Sheet Sync did not return a character list.");
  }

  const requestedIds = new Set(
    requestedCharacters.map((character) => character.id),
  );
  const updates = entries.map(normalizeCharacterSheetUpdate);
  const returnedIds = new Set(updates.map((update) => update.characterId));

  if (
    updates.length !== requestedCharacters.length ||
    returnedIds.size !== updates.length ||
    updates.some((update) => !requestedIds.has(update.characterId)) ||
    [...requestedIds].some((id) => !returnedIds.has(id))
  ) {
    throw new Error(
      "Character Sheet Sync must return every requested character exactly once.",
    );
  }

  return updates;
};

const normalizeCharacterSheetUpdate = (
  entry: unknown,
): CharacterSheetUpdate => {
  if (!entry || typeof entry !== "object") {
    throw new Error("Character Sheet Sync returned an invalid character.");
  }

  const { id, items } = entry as { id?: unknown; items?: unknown };
  if (typeof id !== "string" || !id.trim() || !Array.isArray(items)) {
    throw new Error("Character Sheet Sync returned an invalid character.");
  }
  if (items.length > MAX_SHEET_ITEMS) {
    throw new Error("Character Sheet Sync returned too many sheet items.");
  }
  if (
    items.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim() ||
        item.trim().length > MAX_SHEET_ITEM_LENGTH,
    )
  ) {
    throw new Error("Character Sheet Sync returned an invalid sheet item.");
  }

  return {
    characterId: id.trim(),
    sheetItems: normalizeSheetItems(items as string[]),
  };
};

const MAX_SHEET_ITEMS = 10;
const MAX_SHEET_ITEM_LENGTH = 240;
