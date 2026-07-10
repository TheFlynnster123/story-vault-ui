import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { toUserMessage } from "../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";

export const DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL = 3;
export const DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT = 5;

export const getCharacterSheetGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new CharacterSheetGenerationService(chatId),
);

interface CharacterSheetResponse {
  newCharacters: Array<{ name: string; sheet: string }>;
}

const CHARACTER_SHEET_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "new_primary_character_sheets",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["newCharacters"],
      properties: {
        newCharacters: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "sheet"],
            properties: {
              name: { type: "string" },
              sheet: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export class CharacterSheetGenerationService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async maybeGenerateForNewPrimaryCharacters(): Promise<number> {
    const settingsService = d.ChatSettingsService(this.chatId);
    const settings = await settingsService.Get();
    if (settings?.characterSheetsAutoGenerateEnabled === false) {
      return 0;
    }

    const interval = normalizeInterval(settings?.characterSheetsCheckInterval);
    const nextCount = (settings?.characterSheetsMessagesSinceLastCheck ?? 0) + 1;

    if (nextCount < interval) {
      await settingsService.update({
        characterSheetsMessagesSinceLastCheck: nextCount,
      });
      return 0;
    }

    await settingsService.update({ characterSheetsMessagesSinceLastCheck: 0 });
    return this.generateSafely();
  }

  async generateNow(): Promise<number> {
    await d.ChatSettingsService(this.chatId).update({
      characterSheetsMessagesSinceLastCheck: 0,
    });
    return this.generateSafely();
  }

  private async generateSafely(): Promise<number> {
    try {
      return await this.generateForNewPrimaryCharacters();
    } catch (error) {
      d.ErrorService().log("Failed to generate character sheets", error);
      return 0;
    }
  }

  private async generateForNewPrimaryCharacters(): Promise<number> {
    const characterService = d.CharacterDescriptionsService(this.chatId);
    const characters = await characterService.get();
    const contextMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildGenerationRequestMessages(false);
    const { prompt, model, requestSettings } = await this.getPromptSettings();

    const response = await d.OpenRouterChatAPI().postStructuredChat<unknown>(
      buildPromptMessages(contextMessages, prompt, characters.map((c) => c.name)),
      CHARACTER_SHEET_RESPONSE_FORMAT,
      model,
      "Character Sheets",
      false,
      requestSettings,
      "chat",
    );

    const candidates = normalizeResponse(response);
    let savedCount = 0;
    for (const candidate of candidates) {
      const saved = await characterService.upsertGeneratedSheet(
        candidate.name,
        candidate.sheet,
      );
      if (saved) savedCount += 1;
    }
    return savedCount;
  }

  private async getPromptSettings(): Promise<{
    prompt: string;
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const prompts = await d.SystemPromptsService().Get();
    return {
      prompt:
        prompts?.characterSheetPrompt ||
        DEFAULT_SYSTEM_PROMPTS.characterSheetPrompt,
      model:
        prompts?.characterSheetModel ||
        DEFAULT_SYSTEM_PROMPTS.characterSheetModel ||
        undefined,
      requestSettings: prompts?.characterSheetRequestSettings,
    };
  }
}

const buildPromptMessages = (
  contextMessages: LLMMessage[],
  prompt: string,
  knownNames: string[],
): LLMMessage[] => [
  ...contextMessages,
  toUserMessage(
    [
      prompt,
      `Known character names: ${knownNames.length ? knownNames.join(", ") : "(none)"}.`,
      "Return exactly the configured JSON object. Do not include already-known characters.",
    ].join("\n\n"),
  ),
];

const normalizeResponse = (response: unknown): CharacterSheetResponse["newCharacters"] => {
  if (!response || typeof response !== "object") return [];
  const candidates = (response as Partial<CharacterSheetResponse>).newCharacters;
  if (!Array.isArray(candidates)) return [];

  return candidates
    .slice(0, 3)
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const { name, sheet } = candidate as Record<string, unknown>;
      if (typeof name !== "string" || typeof sheet !== "string") return [];
      const normalized = { name: name.trim(), sheet: sheet.trim() };
      return normalized.name && normalized.sheet ? [normalized] : [];
    });
};

const normalizeInterval = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL;
  return Math.max(1, Math.min(100, Math.round(value!)));
};
