export interface SystemPrompts {
  newStoryPrompt?: string;
}

export const DEFAULT_SYSTEM_PROMPTS: SystemPrompts = {
  newStoryPrompt:
    "Based on the user's input, generate a compelling story opening or template. The story should be open-ended to allow for continuation, well thought out with clear narrative structure, and vivid with descriptive language that brings the setting and characters to life. Focus on creating an engaging hook that draws the reader in while leaving room for the story to develop naturally.",
};
