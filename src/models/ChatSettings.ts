import { FirstPersonCharacterPrompt } from "../templates/FirstPersonCharacterTemplate";

export interface ChatSettings {
  timestampCreatedUtcMs: number;
  chatTitle: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  promptType: "Manual" | "First Person Character";
  customPrompt?: string;
}

export const ChatSettingsUtils = {
  getStoryPrompt(chatSettings: ChatSettings): string {
    if (hasCustomPrompt(chatSettings)) return chatSettings.customPrompt!;
    return FirstPersonCharacterPrompt;
  },
};

function hasCustomPrompt(chatSettings: ChatSettings): boolean {
  return chatSettings?.promptType === "Manual" && !!chatSettings?.customPrompt;
}
