/**
 * System Prompts Configuration
 *
 * Defines the interface and default values for system prompts used
 * throughout the application for AI generation tasks.
 */

export interface SystemPrompts {
  /** Prompt used when generating new stories from user input */
  newStoryPrompt: string;
  /** Model override for story generation (empty = use default) */
  newStoryModel?: string;

  /** Prompt for generating first-person narrative content. Pre-filled into ChatSettings.prompt at chat creation. */
  defaultFirstPersonPrompt: string;

  /** Prompt for generating third-person narrative content. Pre-filled into ChatSettings.prompt at chat creation. */
  defaultThirdPersonPrompt: string;

  // TODO: Wire this to image generation flow
  /** Prompt for AI image generation */
  defaultImagePrompt: string;
  /** Model override for image prompt generation (empty = use default) */
  defaultImageModel?: string;

  /** Prompt for generating chapter summaries */
  chapterSummaryPrompt: string;
  /** Model override for chapter summary generation (empty = use default) */
  chapterSummaryModel?: string;

  /** Prompt for generating chapter titles */
  chapterTitlePrompt: string;
  /** Model override for chapter title generation (empty = use default) */
  chapterTitleModel?: string;

  /** Prompt for generating book summaries (summaries of multiple chapters) */
  bookSummaryPrompt: string;
  /** Model override for book summary generation (empty = use default) */
  bookSummaryModel?: string;

  /** Prompt for generating book titles */
  bookTitlePrompt: string;
  /** Model override for book title generation (empty = use default) */
  bookTitleModel?: string;

  /** Prompt for selecting which character to depict in an image */
  characterSelectionPrompt: string;
  /** Model override for character selection (empty = use default) */
  characterSelectionModel?: string;

  /** Prompt for generating character descriptions */
  characterDescriptionPrompt: string;
  /** Model override for character description generation (empty = use default) */
  characterDescriptionModel?: string;
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

  chapterSummaryPrompt:
    "Review the conversation above and generate a brief summary of the current chapter. Focus on the key events, character developments, and plot progression. Keep the summary to about a paragraph. Provide your summary directly without formatting or a preamble.",

  chapterTitlePrompt:
    "Review the conversation above and generate a concise, engaging title for the current chapter. The title should capture the essence of what happened. Keep it short (3-7 words). Provide only the title without formatting or any preamble.",

  bookSummaryPrompt:
    "Review the chapter summaries above and generate a comprehensive summary that combines them into a single cohesive book summary. Focus on the overarching narrative arc, major character developments, and key plot points across all chapters. Keep the summary to 2-3 paragraphs. Provide your summary directly without formatting or a preamble.",

  bookTitlePrompt:
    "Review the chapter summaries above and generate a concise, engaging title for this collection of chapters as a book. The title should capture the overarching theme or narrative arc. Keep it short (3-7 words). Provide only the title without formatting or any preamble.",

  characterSelectionPrompt:
    "Review the conversation above and identify which character should be depicted in the next image. Choose the character most prominently featured in the current scene or narrative moment - this may not be the main character. Consider who is actively participating in the scene, who the narrative is focusing on, and who would be most meaningful to visualize. Respond with ONLY the character's name, nothing else. If you are highly confident, respond with just the name. If uncertain, respond with 'UNCLEAR'.",
  characterSelectionModel: "x-ai/grok-4.1-fast",

  characterDescriptionPrompt: `Consider the character present.

For each reply, include 3-5 words for:
- **Face & Head Features** (face shape, eye color, hair color/style)
- **Body Traits** (age range, build, height, skin tone)
- **Distinctive Features** (scars, freckles, tattoos, other permanent marks)

Respond with ONLY a detailed, comma separated list describing the character's appearance for consistent image generation.
Do NOT include setting, actions, poses, or temporary clothing.

Example:
"young woman, oval face, green eyes, long dark wavy hair, olive skin, medium height, slim build, faint scar on left eyebrow"`,
};
