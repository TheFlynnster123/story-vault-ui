# Character Sheets — Implementation Plan

## Goal

Add chat-scoped **Character Sheets** that are automatically generated for newly introduced primary characters, editable by the user, and included as durable context in every narrative LLM request. Sheets float immediately before the final five chat messages by default, so recent history remains at the end of the request. The user can configure the generation prompt globally and the automatic check cadence directly in the Characters section of the chat Flow panel.

## What already exists

The repository already has a strong foundation, but it is specifically an image-consistency feature:

- `src/features/Characters/` stores chat-scoped `CharacterDescription` records in the encrypted `character-descriptions` managed blob.
- Each record currently has a name, an appearance-only `description`, dates, and an optional preferred image.
- `CharacterDescriptionGenerationService` and `CharacterSelectionService` use configurable system prompts to support image generation.
- `CharacterDescriptionsPage` is the existing user editor, and `CharacterDescriptionsSection` already appears in `FlowAccordion`.
- `LLMMessageContextService` is the shared construction point for normal generation, reasoning, regeneration, and Agent Flow context. It already injects Memories as a durable system message.
- `ChatSettings` holds chat-scoped automatic-work configuration. Agent Flow is the precedent: it has an enabled flag, a message interval, and a counter, configured through the UI.

This means Character Sheets should extend the existing Characters feature and shared context builder. They should **not** be implemented as an additional, independent memory system.

## Product decisions

### Character Sheet content

Migrate the existing image-oriented `description` field to `appearance`, then add a separate `sheet` field for narrative continuity. A sheet should be concise, factual, and stable, covering only information supported by the chat:

- identity and story role
- personality, motivations, goals, and fears
- relationships and important history
- voice, habits, values, or constraints
- stable physical traits when narratively relevant

This preserves existing image behavior and avoids forcing image prompts to consume verbose story material.

### What qualifies for automatic creation

The automatic generator must create sheets only for **new primary characters**. Its prompt should explicitly ignore incidental named people, crowds, one-off references, and already-known characters. It should receive the saved character names so it can avoid duplicates and use the canonical name already in the record when a fuzzy match exists.

Use structured output rather than free text. The generated response should contain a bounded list such as:

```ts
{
  newCharacters: [
    { name: "Mara Venn", sheet: "..." }
  ]
}
```

The application must validate the response, trim fields, reject blank names/sheets, cap the number of records per pass, and never overwrite a manually edited sheet. If a matching character exists with an empty auto-generated sheet, it may be filled; otherwise the existing record wins.

### When checks happen

Run the check once per configured number of saved **user messages**, immediately before the normal text-generation request is assembled. This lets a primary character introduced in the user's latest message be present in the response that follows. The check naturally also sees the prior assistant reply, so characters introduced by the model are picked up on the next configured pass.

The check must fail open: an unavailable model, malformed structured response, or save failure is logged and must not prevent the user from receiving a normal chat response.

The default should be enabled with a conservative cadence (recommended: every 3 user messages). A manual **Check now** action in the Characters Flow panel provides an immediate escape hatch without waiting for the cadence.

### Placement in conversation context

Character Sheets should not be appended after the full transcript. They should float immediately before the final **N** projected chat messages, where `N` defaults to `5`. This preserves complete chronological history while ensuring the most recent conversation remains closest to the final story instruction.

The placement is calculated from the `LLMChatProjection` message list after its normal chapter compression and reasoning filtering. If fewer than N messages exist, sheets are placed before the available transcript. A value of `0` places sheets after all chat messages, which preserves the old append-at-the-end behavior as an explicit option.

## Data and configuration design

### Character schema versions and migration

Keep the existing `character-descriptions` blob key. Its encrypted contents are migrated lazily the first time a chat's character data is accessed. The chat owns the migration state through a version number, not a one-off boolean:

```ts
const CHARACTER_SCHEMA_VERSION = 2;

interface ChatSettings {
  // Missing is treated as version 1 for existing chats.
  charactersSchemaVersion?: number;
}
```

New chats are created with `charactersSchemaVersion: 2`; existing chats with a missing version are version 1.

#### Version 1 — current persisted shape

```ts
interface CharacterDescriptionV1 {
  id: string;
  name: string;
  description: string; // Appearance-only image context
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

// Example encrypted blob payload after decryption
const v1Characters: CharacterDescriptionV1[] = [
  {
    id: "b018bc04-991e-4b08-9e1f-1e4d3e6d7f3c",
    name: "Mara Venn",
    description: "olive skin, short black curls, green eyes, lean build",
    createdAt: "2026-07-09T12:00:00.000Z",
    updatedAt: "2026-07-09T12:00:00.000Z",
  },
];
```

#### Version 2 — Character Appearance plus Character Sheet

```ts
interface CharacterDescriptionV2 {
  id: string;
  name: string;
  appearance: string; // Image-focused, stable physical traits
  sheet?: string; // New narrative continuity context
  sheetSource?: "auto" | "manual";
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

const v2Characters: CharacterDescriptionV2[] = [
  {
    id: "b018bc04-991e-4b08-9e1f-1e4d3e6d7f3c",
    name: "Mara Venn",
    appearance: "olive skin, short black curls, green eyes, lean build",
    sheet:
      "A newly recruited cartographer who hides her fear of the sea behind dry humor. She is determined to find her missing brother.",
    sheetSource: "auto",
    createdAt: "2026-07-09T12:00:00.000Z",
    updatedAt: "2026-07-09T12:05:00.000Z",
  },
];
```

The migration is deterministic and idempotent:

1. Read the character blob and `charactersSchemaVersion`.
2. If the version is below 2, map `description` to `appearance` when `appearance` is absent, preserve all other fields, and remove the legacy property from the saved v2 record.
3. Save the v2 character blob.
4. Only after that save succeeds, update the chat setting to `charactersSchemaVersion: 2`.

If the setting write fails, the next access safely repeats the already-idempotent conversion. If a legacy chat is dormant beyond the migration window, retain a read fallback (`appearance ?? description ?? ""`) until a deliberate compatibility-removal release; a time-based cutoff alone is unsafe for encrypted, client-migrated blobs.

The page can label the two text areas clearly as **Character Sheet** and **Character Appearance**.

### Add chat-scoped check settings

In `src/features/Chat/services/Chat/ChatSettings.ts`, add:

```ts
characterSheetsAutoGenerateEnabled?: boolean;
characterSheetsCheckInterval?: number;
characterSheetsMessagesSinceLastCheck?: number;
/** Number of projected chat messages to retain after durable character context. Defaults to 5. */
characterSheetsTrailingMessageCount?: number;
```

Keep them optional, with runtime defaults in the new service. `characterSheetsTrailingMessageCount` is clamped to a bounded non-negative range (recommended: 0–50). Persist them through the existing partial `ChatSettingsService.update()` API so unrelated chat settings are preserved.

### Add global prompt/model configuration

In `src/features/Prompts/services/SystemPrompts.ts`, add a Character Sheet generation prompt and follow the existing per-prompt model pattern:

```ts
characterSheetPrompt: string;
characterSheetModel?: string;
characterSheetRequestSettings?: OpenRouterRequestSettings;
```

Add a safe default prompt that asks for only newly introduced primary characters and requires factual, compact sheets. Add a **Character Sheet Prompt** and **Character Sheet Model** section to `SystemPromptsEditor`. Because `useSystemPrompts` merges stored values over `DEFAULT_SYSTEM_PROMPTS`, existing users receive the new default automatically.

## Implementation plan

### 1. Evolve the Characters data layer

- Add version-aware v1 decoding and the v2 `CharacterDescription` model, factory, and update helper with `appearance`, `sheet`, and `sheetSource`.
- Add an idempotent migration service/entry point that persists v2 character data before marking `charactersSchemaVersion: 2` in `ChatSettings`.
- Extend `CharacterDescriptionsService` with an explicit generated-sheet upsert method. It should reuse the current exact/fuzzy/ambiguity-safe name lookup and preserve user-authored content.
- Keep `CharacterDescriptionsManagedBlob` and its storage key unchanged for backward compatibility.
- Rename visible language from “Character Descriptions” to “Characters” or “Character Sheets” where appropriate, but leave image-specific wording wherever it really means physical image description.

### 2. Create an automatic Character Sheet generation service

Add `CharacterSheetGenerationService` under `src/features/Characters/services/` and register it in `src/services/Dependencies.ts`.

- Load the configured prompt, model, and request settings with defaults.
- Build generation context via `LLMMessageContextService.buildGenerationRequestMessages(false)`, so the service respects chapter compression, notes, memories, existing sheets, and the current chat transcript.
- Append a strict schema instruction plus a list of known character names.
- Call `OpenRouterChatAPI.postStructuredChat()` with a strict schema; normalize and validate the result before saving.
- Provide `maybeGenerateForNewPrimaryCharacters()` to own enabled/cadence/counter behavior, and `generateNow()` for the Flow-panel manual action.
- Reset the counter only when a check is attempted; when the cadence has not yet been reached, increment it. Log errors through `ErrorService` and return a no-op result instead of throwing through chat generation.

### 3. Trigger the check before each eligible reply

Integrate the automatic check in `TextGenerationService.generateResponse()` before reasoning and before the normal response context is built. `useChatGeneration` already saves the user message before invoking this service, so the detector will see that message.

Do not place the primary trigger solely in `useChatGeneration`: direct callers of `TextGenerationService` should preserve the same behavior. Keep Agent Flow's auto-run independent; both systems can be configured separately and have different responsibilities.

### 4. Inject sheets into all durable narrative context

Extend `LLMMessageContextService` with `fetchCharacterDescriptions()` and `buildCharacterSheetMessages()`.

- Emit one concise, clearly delimited system message, for example `# Character Sheets`, containing only non-empty sheets and canonical names.
- Add a single context-placement helper that splits projected chat messages at `max(0, chatMessages.length - trailingMessageCount)`.
- In `buildGenerationRequestMessages()`, assemble the request in this order: earlier chat history, durable context (Memories and Character Sheets), the final N chat messages, then the story prompt. Grouping the existing Memories with sheets keeps the recent transcript at the end rather than moving only one durable context type.
- Apply the same split and ordering to both reasoning paths. For consolidated reasoning, serialize earlier history, durable context, and the trailing history as separately labelled sections before the reasoning instructions. For non-consolidated reasoning, insert the durable system messages between the two transcript slices.
- Agent Flow already calls `buildGenerationRequestMessages(false)`, so it receives sheets automatically.
- Keep the image pipeline's existing appearance-only character context separate. It should use `appearance`, not the broader narrative sheet.

While making this change, fix regeneration assembly. The current regeneration implementation builds all messages and then slices the array before the target message; that also discards static memory context appended after chat history. Refactor it to truncate only the chat transcript first, then run the same N-message placement helper before adding feedback. This guarantees Memories and Character Sheets are present while the retained trailing context remains closest to the regeneration instruction.

Chapter/book summary generation can remain unchanged unless a later product decision says generated summaries should actively use Character Sheets. The requirement here is to provide sheets with narrative chat messages, reasoning, regeneration, and Agent Flow, which all share the primary context pipeline.

### 5. Update the Characters UI and Flow configuration

Update `CharacterDescriptionsPage` to support full sheet editing:

- present a prominent narrative **Character Sheet** textarea;
- present **Character Appearance** as a distinct secondary image-focused field;
- mark auto-generated sheets and give the user a clear manual-edit state;
- retain existing create, delete, preferred-image, and debounced save behavior.

Expand `CharacterDescriptionsSection` in the Chat Flow panel rather than creating a separate settings page:

- show character count and compact sheet previews;
- provide an **Edit character sheets** action that opens the existing Characters editor route;
- provide an enable/disable switch for automatic sheet creation;
- provide a number input for “Check every N user messages”;
- provide a number input for “Keep N recent messages after character context” (default 5);
- include a **Check now** action and small status/error feedback;
- disable cadence controls while automatic generation is disabled, while keeping context-placement controls available.

This keeps both requested controls—cadence and editing—under the Characters panel in the chat flow component.

### 6. Tests and documentation

Add or extend unit tests for:

- v1-to-v2 migration, retry behavior when the settings update fails, and a legacy read fallback;
- data compatibility for v2 records without `sheet`;
- generated upsert behavior, including fuzzy matching, ambiguity, and preservation of manual sheets;
- prompt/model fallback and strict structured-response validation;
- cadence, enabled/disabled behavior, counter reset, manual check, and fail-open errors;
- `LLMMessageContextService` injection order for normal generation, both reasoning modes, Agent Flow-compatible generation context, and regeneration, including N=0, fewer-than-N, and default-N placement cases;
- Flow-panel controls and Character Sheets page editing/autosave;
- `TextGenerationService` calling the preflight check before reasoning and response generation.

Update `src/features/Characters/Characters.md` to distinguish narrative sheets from image descriptions and document the automatic-check lifecycle.

Run the focused Vitest suites first, then the full test suite and TypeScript/lint checks defined in `package.json`.

## Acceptance criteria

- A primary character introduced in an eligible turn receives a persisted, chat-scoped Character Sheet without user intervention.
- The Character Sheet prompt is editable from System Prompts and supports the same optional model/request configuration used elsewhere.
- Users can edit sheets and character appearances separately.
- All non-empty sheets are supplied as bounded, clearly labeled durable context to normal replies, reasoning, regeneration, and Agent Flow, immediately before the final configured number of projected chat messages (five by default).
- The Characters Flow panel exposes automatic-check enablement, cadence, context placement, manual check, and access to the sheet editor.
- Existing character-description blobs migrate safely, and image generation continues to receive appearance-only context.
- Automatic generation failures do not block text chat.

## Additional character-feature ideas

- **Relationships map:** a lightweight graph of allies, rivals, family, and unresolved tensions, shown from the Characters panel.
- **Continuity alerts:** flag a potential contradiction between a new message and a saved sheet (eye color, allegiance, history, or current goal) before sending.
- **Scene cast selector:** let the user choose active characters for the next scene so only relevant sheets are injected, reducing context size in large casts.
- **Character arc timeline:** record major turning points, promises, secrets, and changes in motivation per character.
- **Sheet versions and restore:** show when an automatic or manual update changed a sheet and let the user restore an earlier version.
- **Portrait consistency:** link a character's preferred image, visual description, and sheet so image generation can preserve both appearance and narrative role.
