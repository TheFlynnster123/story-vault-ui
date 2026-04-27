# Character Descriptions Feature

## Overview

The Character Descriptions feature improves image consistency by persisting per-chat character physical traits and injecting them into image prompt generation.

Each image generation request now follows this flow:

1. Select the primary character for the current narrative moment using an LLM call over full chat context.
2. Look up that character in the chat-scoped Character Descriptions blob with high-confidence fuzzy matching.
3. If a description exists, include it in image prompt generation.
4. If missing, present a 3-option modal:
   - Generate Description
   - Create Manually
   - Skip for now
5. Generate the image prompt and trigger image job creation.

## Core Behavior

### Character Selection

`CharacterSelectionService` selects one primary character (or returns `UNCLEAR`) using:
- `SystemPrompts.characterSelectionPrompt`
- `SystemPrompts.characterSelectionModel` (optional override)

### Character Description Lookup

`CharacterDescriptionsService.findByName` supports:
- Case-insensitive exact matching
- High-confidence fuzzy matching for name variants (for example, `Sarah` => `Sarah Chen`)
- Ambiguity rejection when top fuzzy matches are too close

### Missing Description Decision Modal

When a selected character has no saved description:

- **Generate Description**
  - Uses `CharacterDescriptionGenerationService`
  - Saves generated image-style character descriptor to the character record
  - Continues image generation with the new description

- **Create Manually**
  - Creates/ensures blank character record
  - Navigates user to Character Descriptions editor (`/chat/:chatId/characters`)
  - Does not auto-generate image in this step

- **Skip for now**
  - Creates/ensures blank character record (remembers decision)
  - Continues image generation without character description context

Blank descriptions are represented in UI with placeholder text:
`No character description was generated.`

## Prompt Integration

When a non-empty description is available, image prompt generation receives:

1. Character context as a system message (`# Character: {name}` + physical description)
2. Base image prompt (model-specific prompt or `SystemPrompts.defaultImagePrompt`)
3. Conversation context messages

The default generation style is a comma-separated list (not paragraph prose) that mirrors image prompt structure while remaining appearance-only (no actions/poses/scene context).

## UI Surfaces

### Flow Accordion

`CharacterDescriptionsSection` appears in Flow with:
- Character count
- Expandable preview list
- Navigation to full editor page

### Character Descriptions Page

`CharacterDescriptionsPage` supports:
- Add character
- Edit name/description
- Delete with confirmation
- Debounced autosave

## Data and Storage

- Storage type: managed encrypted blob (`character-descriptions`)
- Scope: per chat
- Schema:

```ts
interface CharacterDescription {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

## System Prompt Configuration

The System Prompts editor includes:
- Character Selection Prompt + Model
- Character Description Prompt + Model

Default model behavior:
- Character selection defaults to `x-ai/grok-4.1-fast`

Defaults are merged with persisted prompt settings to support backward-compatible schema additions.

## Questions and Assumptions (Resolved)

### Decisions

- Name matching uses fuzzy, high-confidence lookup with ambiguity guardrails.
- Only one primary character is selected per image generation.
- Character selection is recomputed each image request using full chat history.
- Missing-description "skip" is remembered by creating a blank character record.
- Character descriptions use image-style comma-separated descriptors focused on appearance only (not paragraphs, not actions).
- Character context is merged with base image prompt and scene context.
- Character selection and description generation use separate configurable models.
- Unit tests are the required test scope for this phase.

### Assumptions

- Character descriptions are per-chat, not global.
- No migration is required; feature is additive.
- Existing chats remain fully compatible.
- Past images are not retroactively regenerated when descriptions change.
