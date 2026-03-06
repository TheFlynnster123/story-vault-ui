# AI Feature

## Overview

The AI feature provides shared, reusable UI components used across the application for AI-powered generation tasks. These components offer a consistent look and feel for interacting with AI functionality throughout Story Vault.

## Components

### `GenerateButton`

A styled Mantine `Button` with a sparkle icon, used as the standard trigger for AI generation actions (e.g., generating story text, image prompts). Accepts all standard `ButtonProps`.

### `EditPromptButton`

A subtle, compact button with a megaphone icon, used to navigate users to prompt editing screens. Provides a consistent entry point for customizing AI prompts.

### `ModelSelect`

A dropdown selector for choosing which Grok LLM model to use for chat generation. Options include various Grok model variants with different speed/reasoning tradeoffs. Selecting "Default" (empty value) uses the system-configured model.

**Available models:**
- `grok-4-0709`
- `grok-4-1-fast-reasoning`
- `grok-4-fast-non-reasoning`
- `grok-4-fast-reasoning` (Recommended)
- `grok-3`

## Usage

These components are consumed by other features:

- **Chat** — uses `GenerateButton` for response generation
- **StoryEditor** — uses `GenerateButton`, `EditPromptButton`, and `ModelSelect` in the story generator modal
- **SystemSettings** — uses `ModelSelect` for configuring the default model

## Directory Structure

```
AI/
  components/
    EditPromptButton.tsx
    GenerateButton.tsx
    ModelSelect.tsx
```
