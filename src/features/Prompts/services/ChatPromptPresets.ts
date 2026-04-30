export interface ChatPromptPreset {
  id: string;
  name: string;
  prompt: string;
  createdAtUtcMs: number;
  updatedAtUtcMs: number;
}

export interface ChatPromptPresets {
  presets: ChatPromptPreset[];
}

export const DEFAULT_CHAT_PROMPT_PRESET_IDS = {
  thirdPerson: "default-third-person",
  firstPerson: "default-first-person",
} as const;

