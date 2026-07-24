# Characters

## Overview

Characters are encrypted, chat-scoped records with two separate forms of
continuity:

- **Appearance** is stable physical information used only for image generation.
- **Character Sheet** is an explicit list of identity-focused narrative facts
  used in text-model context.

Only approved sheets belonging to tracked, effectively active characters enter
text context. Untracked records also contribute no appearance context to image
generation.

## Schema

Characters are stored in the existing `character-descriptions` managed blob.
Schema version 4 is:

```ts
interface CharacterDescription {
  id: string;
  name: string;
  appearance: string;
  sheetItems: string[];
  sheetSource?: "auto" | "manual";
  isTracked?: boolean;
  autoAcceptChanges?: boolean;
  detectedActive: boolean;
  activeOverride?: boolean;
  preferredImage?: { id: string; source: "system" | "variant" };
  createdAt: string;
  updatedAt: string;
}
```

Effective activity is `activeOverride ?? detectedActive`. Missing
`isTracked` values migrate to `true`; missing `autoAcceptChanges` values migrate
to `false`.

Version 1 records used `description`; version 2 records used `appearance` and
`sheet?: string`. Migration preserves prose as one item, converts Markdown-only
bullets to items, defaults missing activity to active, saves the blob, and only
then advances `charactersSchemaVersion`.

## Synchronization pipeline

`CharacterMaintenanceService` owns cadence and orchestration.

1. `ActiveCharacterSelectionService` uses recent projected scene messages,
   strict structured output, and the canonical roster.
2. Unknown names are accepted only when grounded in recent context. Fuzzy
   variants of an existing name cannot create duplicates.
3. `CharacterSheetSyncService` receives every tracked, effectively active
   record and its complete current item list. Untracked names remain in the
   canonical roster so model output cannot recreate them as new characters.
4. It requires a complete, one-to-one replacement batch with bounded items.
5. `CharacterMaintenanceService` applies opted-in existing-character changes
   through the proposal apply service and persists the remainder for review.

Automatic runs are started after a saved user turn and execute without blocking
the normal text response. Manual runs are available from Quick Chat Controls,
the Characters settings panel, and each character card.

## Approval

`CharacterUpdateProposalManagedBlob` persists the actionable result across
navigation and refresh. `useCharacterUpdateProposal` derives the
character-themed Async Control from this source of truth.

Changes for existing characters with `autoAcceptChanges` enabled are applied
through the same conflict-checked proposal path. Mixed batches leave only the
remaining changes for review. New characters always require review.

The review modal shows only added and removed sheet items, matching unchanged
items independently of array position. It requires a confirm/dismiss decision
for each character and also supports dismiss all or review later. Applying
decisions selects the confirmed changes and calls
`CharacterDescriptionsService.applyUpdateProposal`, which compares each
selected existing record’s `updatedAt` with the proposal base version, verifies
that it is still tracked, and checks selected new names for conflicts. It
performs one character-blob save only when the confirmed set is conflict-free.
Manual `activeOverride` values are preserved.

The proposal blob is deleted only after a successful decision apply or explicit
dismissal.

## Context placement

`LLMMessageContextService` places memories and approved active Character Sheets
before the configured recent-message tail:

```text
earlier projected messages
Memories
Character Sheets
last N projected messages
generation instruction
```

Character Sheet content is formatted from `sheetItems` as headings and bullets.
Untracked characters, inactive characters, empty sheets, and appearances are
excluded. The same central path covers chat, reasoning, regeneration, chapter
work, book work, and Agent Flow consumers.

## Settings and prompts

Canonical per-chat settings are:

```ts
characterSheetsAutoSyncEnabled?: boolean;
characterSheetsSyncInterval?: number;
characterSheetsMessagesSinceLastSync?: number;
characterSheetsTrailingMessageCount?: number;
```

System Prompts exposes independent prompt, model, and request settings for:

- Active Characters
- Character Sheet Update

Legacy fields remain decoder-only compatibility inputs during migration.
