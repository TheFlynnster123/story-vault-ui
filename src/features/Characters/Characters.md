# Characters

## Overview

Characters are chat-scoped, encrypted records with two distinct forms of continuity:

- **Character Appearance** is a concise, stable physical description used only for image generation.
- **Character Sheet** is concise narrative context—role, motivations, relationships, voice, and constraints—used by text chat, reasoning, regeneration, and Agent Flow.

The Characters Flow section exposes sheet generation, its check cadence, and the context-placement setting. The Characters page is the editor for names, sheets, appearances, and preferred image models.

## Character schema

Character data is stored in the existing `character-descriptions` managed blob. New records use schema version 2:

```ts
interface CharacterDescription {
  id: string;
  name: string;
  appearance: string;
  sheet?: string;
  sheetSource?: "auto" | "manual";
  preferredImage?: { id: string; source: "system" | "variant" };
  createdAt: string;
  updatedAt: string;
}
```

Existing version 1 records used `description` instead of `appearance`. On first character access, the client migrates the field and then writes `charactersSchemaVersion: 2` to the chat settings. The blob is saved before the version flag, so a failed settings update is safe to retry. See [Character Appearance Migration Retirement.md](../../../Character%20Appearance%20Migration%20Retirement.md) for the compatibility-removal process.

## Automatic Character Sheets

`CharacterSheetGenerationService` checks the current chat before an eligible text response. It uses the configurable Character Sheet prompt/model, receives the already-compressed chat context plus known character names, and requires strict structured output.

Only new primary characters are saved. Blank output, malformed output, incidental names, and existing manually edited sheets are ignored. Failures are logged and never block a normal text response.

Per-chat settings in `ChatSettings`:

```ts
characterSheetsAutoGenerateEnabled?: boolean; // default true
characterSheetsCheckInterval?: number; // default 3 user messages
characterSheetsMessagesSinceLastCheck?: number;
characterSheetsTrailingMessageCount?: number; // default 5
```

The Flow section also provides a manual **Check now** action.

## LLM context placement

`LLMMessageContextService` splits the projected chat history before the final configured number of messages. It places Memories and Character Sheets between the earlier and trailing slices:

```text
earlier chat history
Memories
Character Sheets
last N projected chat messages
story/reasoning instruction
```

This keeps durable facts available without pushing the most recent conversation away from the final instruction. The same placement applies to normal generation, chapter title/summary generation, both reasoning modes, regeneration, and Agent Flow. Book title/summary generation also receives Character Sheets before its chapter-summary context.

## Image generation

Image generation continues to select a single character and use only `appearance`. When it is missing, the image workflow offers Generate Appearance, Create Manually, or Skip for now. Narrative Character Sheets are intentionally not sent to image prompt generation.

## Prompt configuration

System Prompts includes independent controls for:

- Character Selection Prompt + Model
- Character Appearance Prompt + Model
- Character Sheet Prompt + Model

Persisted system prompts are merged with defaults, so the new Character Sheet fields are backward compatible.
