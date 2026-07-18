import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../services/Utils/MessageUtils";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { CharacterDescription } from "./CharacterDescription";
import {
  findCharacterByName,
  normalizeCharacterName,
} from "./CharacterNameMatcher";

export interface ActiveCharacterSelection {
  existingCharacterIds: string[];
  newCharacterNames: string[];
}

const ACTIVE_CHARACTER_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "active_characters",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["activeCharacterNames"],
      properties: {
        activeCharacterNames: {
          type: "array",
          maxItems: 20,
          items: { type: "string" },
        },
      },
    },
  },
};

export class ActiveCharacterSelectionService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async select(
    characters: CharacterDescription[],
  ): Promise<ActiveCharacterSelection> {
    const contextMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildGenerationRequestMessages(false);
    const recentMessages = selectRecentSceneMessages(contextMessages);
    const settings = await this.getPromptSettings();
    const response = await d
      .OpenRouterChatAPI()
      .postStructuredChat<unknown>(
        buildActiveCharacterMessages(
          recentMessages,
          settings.prompt,
          characters,
        ),
        ACTIVE_CHARACTER_RESPONSE_FORMAT,
        settings.model,
        "Active Characters",
        false,
        settings.requestSettings,
        "chat",
      );

    return normalizeActiveSelection(response, characters, recentMessages);
  }

  private async getPromptSettings(): Promise<{
    prompt: string;
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const prompts = await d.SystemPromptsService().Get();
    return {
      prompt:
        prompts?.activeCharactersPrompt ||
        DEFAULT_SYSTEM_PROMPTS.activeCharactersPrompt,
      model:
        prompts?.activeCharactersModel ||
        DEFAULT_SYSTEM_PROMPTS.activeCharactersModel ||
        undefined,
      requestSettings: prompts?.activeCharactersRequestSettings,
    };
  }
}

const selectRecentSceneMessages = (messages: LLMMessage[]): LLMMessage[] => {
  const projectedMessages = messages.filter((message) => message.id);
  return projectedMessages.slice(-ACTIVE_CHARACTER_LOOKBACK_MESSAGES);
};

const buildActiveCharacterMessages = (
  contextMessages: LLMMessage[],
  prompt: string,
  characters: CharacterDescription[],
): LLMMessage[] => [
  ...contextMessages,
  toSystemMessage(prompt),
  toUserMessage(
    [
      "Select the active cast and return exactly the configured JSON object.",
      JSON.stringify({
        knownCharacters: characters.map(({ id, name }) => ({ id, name })),
      }),
    ].join("\n\n"),
  ),
];

const normalizeActiveSelection = (
  response: unknown,
  characters: CharacterDescription[],
  contextMessages: LLMMessage[],
): ActiveCharacterSelection => {
  const names = readActiveCharacterNames(response);
  const context = normalizeCharacterName(
    contextMessages.map((message) => message.content).join(" "),
  );
  const existingCharacterIds = new Set<string>();
  const newCharacterNames = new Map<string, string>();

  for (const name of names) {
    const match = findCharacterByName(characters, name);
    if (match) {
      existingCharacterIds.add(match.id);
      continue;
    }

    const normalizedName = normalizeCharacterName(name);
    if (
      !normalizedName ||
      !context.includes(normalizedName) ||
      resemblesKnownCharacterName(normalizedName, characters)
    ) {
      continue;
    }

    if (newCharacterNames.size < MAX_NEW_CHARACTERS_PER_SELECTION) {
      newCharacterNames.set(normalizedName, name.trim());
    }
  }

  return {
    existingCharacterIds: [...existingCharacterIds],
    newCharacterNames: [...newCharacterNames.values()],
  };
};

const readActiveCharacterNames = (response: unknown): string[] => {
  if (!response || typeof response !== "object") {
    throw new Error("Active Characters returned no structured response.");
  }
  const names = (response as { activeCharacterNames?: unknown })
    .activeCharacterNames;
  if (
    !Array.isArray(names) ||
    names.length > MAX_ACTIVE_CHARACTERS ||
    names.some(
      (name) =>
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > MAX_CHARACTER_NAME_LENGTH,
    )
  ) {
    throw new Error("Active Characters returned an invalid character list.");
  }

  return names
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean);
};

const resemblesKnownCharacterName = (
  normalizedName: string,
  characters: CharacterDescription[],
): boolean =>
  characters.some((character) => {
    const knownName = normalizeCharacterName(character.name);
    return (
      knownName.includes(normalizedName) || normalizedName.includes(knownName)
    );
  });

const ACTIVE_CHARACTER_LOOKBACK_MESSAGES = 12;
const MAX_ACTIVE_CHARACTERS = 20;
const MAX_NEW_CHARACTERS_PER_SELECTION = 3;
const MAX_CHARACTER_NAME_LENGTH = 80;
