/**
 * System Prompts Configuration
 *
 * Defines the interface and default values for system prompts used
 * throughout the application for AI generation tasks.
 */

export interface SystemPrompts {
  /** Prompt used when generating new stories from user input */
  newStoryPrompt: string;

  // TODO: Wire this to first-person narrative generation flow
  /** Prompt for generating first-person narrative content */
  defaultFirstPersonPrompt: string;

  // TODO: Wire this to third-person narrative generation flow
  /** Prompt for generating third-person narrative content */
  defaultThirdPersonPrompt: string;

  // TODO: Wire this to image generation flow
  /** Prompt for AI image generation */
  defaultImagePrompt: string;
}

export const DEFAULT_SYSTEM_PROMPTS: SystemPrompts = {
  newStoryPrompt: `You are a creative writing assistant helping users start new stories. When a user provides a story idea or prompt, generate an engaging, open-ended story opening (2-3 paragraphs) that:

- Sets the scene and introduces the main character or situation
- Creates intrigue and hooks the reader
- Leaves room for the story to develop in multiple directions
- Matches the tone and genre implied by the user's input
- Uses vivid, descriptive language

Keep the opening concise but compelling. Focus on creating a strong foundation that the user can build upon.`,

  defaultFirstPersonPrompt:
    "Respond with the next message in the conversation in first person. Keep dialogue realistic and natural, with full sentences. Respond directly where the users response ends.",
  defaultThirdPersonPrompt:
    "Respond with the next message in the conversation in third person. Keep dialogue realistic and natural, with full sentences. Respond directly where the users response ends.",
  defaultImagePrompt: `Consider setting and the character present.

For each reply, include 3–5 words for:
- **Setting** (where the scene takes place)
- **Description of person involved** (appearance, clothing, notable traits)
- **Description of what they are doing** (their action or posture)

Respond with ONLY a detailed, comma separated list depicting the current characters for image generation purposes.

Example:
"restaurant, evening, italian, woman, black dress, classy, sitting, touching face, at table, sitting in chair"`,
};
