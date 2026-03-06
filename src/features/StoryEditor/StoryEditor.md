# StoryEditor Feature

## Overview

The StoryEditor feature provides a dedicated full-page editor for viewing and modifying a chat's story content. The story serves as the foundational narrative context that the AI references during chat generation. Users can manually edit the story text or use AI to generate a new story from a prompt.

## Pages

### `StoryEditorPage`

A full-screen textarea editor for the chat's story. Features:
- Loads the story from the chat's `UserChatProjection` (finds the message with `type: "story"`)
- Large, full-height editing area
- Save and cancel actions
- Integrates the `StoryGeneratorModal` for AI-assisted story creation
- Saves changes via `ChatService.EditStory()`

## Components

### `StoryGeneratorModal`

A modal dialog for generating story content using AI. Features:
- Text input for the story idea/prompt
- Model selector (defaults to system-configured model, overridable per generation)
- "Edit Prompt" button that deep-links to the system prompts page (`#newStoryPrompt`)
- Uses the `newStoryPrompt` system prompt as the system message
- Calls `GrokChatAPI.postChat()` with the system prompt + user idea
- Returns the generated story to the parent editor

## Integration Points

- **System Prompts** — uses `newStoryPrompt` for story generation instructions
- **System Settings** — reads default model from `chatGenerationSettings.model`
- **CQRS** — reads story from `UserChatProjection`, writes via `ChatService.EditStory()`
- **AI Components** — uses `GenerateButton`, `EditPromptButton`, and `ModelSelect`

## Directory Structure

```
StoryEditor/
  components/
    StoryGeneratorModal.tsx
  pages/
    StoryEditorPage.tsx
```
