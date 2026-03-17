# Prompts Feature

## Overview

The Prompts feature manages the system-level prompts that control how the AI generates content across Story Vault. These prompts serve as default instructions for story generation, narrative style, and image descriptions. Users can customize each prompt or reset them to built-in defaults.

## Pages

### `SystemPromptsPage`

A full-page editor for all system prompts. Saves pending changes on navigation away.

## Components

### `SystemPromptsEditor`

The main editor component displaying all configurable prompts. Features:
- Loads current prompts (or falls back to defaults)
- Debounced auto-save on every change
- Per-prompt reset to default with confirmation modal
- Highlight support for deep-linking to a specific prompt (via URL hash)

### `PromptInput`

A reusable prompt editing field with:
- Label and help text
- Auto-sizing textarea
- Reset button with tooltip
- Visual highlight state (orange border/background) for deep-link focus

## Hooks

### `useSystemPrompts`

Loads system prompts from blob storage and provides them to components. Returns `{ systemPrompts, isLoading }`.

### `usePromptHighlight`

Reads the URL hash (e.g., `#newStoryPrompt`) and returns the prompt key to highlight, enabling deep-linking from other features.

## Services

### `SystemPromptsService`

CRUD operations for system prompts:
- `Get()` — retrieves saved prompts
- `Save()` / `SaveDebounced()` — persists prompts
- `SavePendingChanges()` — flushes any debounced writes

### `SystemPromptsManagedBlob`

Handles encrypted blob storage persistence for system prompts.

### `SystemPrompts`

TypeScript interface and defaults:

```typescript
interface SystemPrompts {
  newStoryPrompt: string;              // Prompt for generating new stories
  defaultFirstPersonPrompt: string;    // First-person narrative generation
  defaultThirdPersonPrompt: string;    // Third-person narrative generation
  defaultImagePrompt: string;          // AI image scene description
  chapterSummaryPrompt: string;        // Chapter summary generation
  chapterTitlePrompt: string;          // Chapter title generation
}
```

Each prompt has a built-in default in `DEFAULT_SYSTEM_PROMPTS`.

## Integration Points

- **Chat Creation** — `defaultThirdPersonPrompt` is used as the default chat prompt
- **Text Generation** — the chat's prompt (originally sourced from system prompts) guides the LLM
- **Image Generation** — `defaultImagePrompt` is used when no model-specific prompt is configured
- **Story Generation** — `newStoryPrompt` instructs the LLM when generating story openings
- **Chapter Generation** — `chapterSummaryPrompt` and `chapterTitlePrompt` guide chapter creation
- **Deep Linking** — the `EditPromptButton` component navigates to `/system-prompts#<promptKey>`

## Directory Structure

```
Prompts/
  components/
    PromptInput.tsx
    SystemPromptsEditor.tsx
  hooks/
    usePromptHighlight.ts
    useSystemPrompts.ts
  pages/
    SystemPromptsPage.tsx
  services/
    SystemPrompts.ts
    SystemPromptsManagedBlob.ts
    SystemPromptsService.ts
```
