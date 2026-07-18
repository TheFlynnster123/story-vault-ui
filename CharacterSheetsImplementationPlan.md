# Character Sheets Implementation Plan

## Objective

Evolve Character Sheets from optional free-form summaries into concise,
identity-focused bullet lists that:

- stay current as a story progresses;
- include only the active cast in model context;
- remain manually controllable;
- never allow model output to change saved characters without user approval;
  and
- keep automatic maintenance off the normal response critical path.

This plan incorporates the requirements in `CharacterSheets.md`, the existing
character, chat-context, prompt, encrypted-blob, and Flow implementations, and
the approval lifecycle defined by `AsyncControls.md`.

## Researched baseline

The pre-change implementation has useful boundaries but combines several
concerns:

- `CharacterDescription` stores appearance and an optional Markdown/prose
  `sheet` string.
- `CharacterDescriptionsService` owns encrypted per-chat persistence and
  name matching.
- automatic generation discovers only new primary characters;
- `LLMMessageContextService` injects every non-empty sheet without activity
  filtering;
- character cadence and placement settings live in the large Flow preview;
- System Prompts has one legacy Character Sheet generation prompt/model; and
- the Characters page edits free-form fields but has no active-cast or
  complete-list update workflow.

Relevant reusable conventions:

- `ManagedBlob` provides encrypted persistence, debounced saves, subscriptions,
  and pending-save flushing.
- `AsyncActionControl` defines the persistent-action affordance beneath Quick
  Chat Controls.
- Chapter and Agent Flow workflows demonstrate that actionable background
  state should not be written into chat history.
- `LLMMessageContextService` is the central boundary for consistent context
  placement across generation consumers.

## Product decisions

### 1. Keep appearance and narrative identity separate

`appearance` remains stable physical information for image generation.
`sheetItems` contains only durable facts about who the character is:

- personality and temperament;
- beliefs, values, motivations, goals, and fears;
- relationships and emotional stances;
- voice, habits, boundaries, and stable constraints.

Exclude actions, chronology, current location, scene state, temporary clothing
or injuries, and physical appearance.

### 2. Store structured items, not formatted Markdown

Use `sheetItems: string[]` as the persisted representation. The UI edits one
item per control and context formatting adds Markdown bullets only at the
boundary.

Benefits:

- no lossy parsing during normal operation;
- deterministic add/edit/delete behavior;
- precise item count and length validation;
- complete-list replacement semantics; and
- simpler testing.

### 3. Separate detected activity from user authority

Persist:

```ts
detectedActive: boolean;
activeOverride?: boolean;
```

Resolve activity with:

```ts
activeOverride ?? detectedActive
```

Automatic selection may change only `detectedActive`. The Characters page
switch sets `activeOverride`; **Use automatic activity** clears it.

### 4. Use a two-stage maintenance run

At each eligible run:

1. Select the active cast from recent scene messages and the canonical roster.
2. Reconcile known names and conservatively represent newly introduced active
   primary characters.
3. Resolve effective activity, honoring overrides.
4. Send the effective active cast and every full current item list to the sheet
   update model.
5. Require a full replacement for every requested record.
6. Compare the output with current state and construct only meaningful changes.
7. Persist a proposal for review.

Active selection is intentionally recent-scene focused. Sheet synchronization
may use the normal compressed context because it maintains durable identity,
but the full current list is always supplied explicitly.

### 5. Require approval for every model-generated character mutation

No model result may directly mutate the character blob. This applies to:

- automatic cadence runs;
- **Prepare Character Sheet Updates** in Quick Chat Controls;
- **Prepare updates now** on the Characters page; and
- per-character **Generate sheet** / **Update sheet**.

Persist one `CharacterUpdateProposal` per chat:

```ts
interface CharacterUpdateProposal {
  id: string;
  source: "automatic" | "manual";
  createdAt: string;
  changes: CharacterUpdateChange[];
}
```

Each change records:

- character ID and canonical display name;
- whether the character is new;
- base `updatedAt` for conflict detection;
- current and proposed sheet items; and
- current and proposed detected activity when relevant.

The proposal is actionable application state, not story content, so it belongs
in its own encrypted managed blob rather than chat history.

### 6. Follow the Async Control lifecycle

When proposal persistence succeeds:

1. Derive a character-themed **Review character updates** Async Control from
   the proposal blob.
2. Place it under Quick Chat Controls with the shared red attention indicator.
3. Open a review modal showing before/after sheets, activity changes, and new
   characters.
4. Require **Confirm** or **Dismiss** for each character.
5. Allow **Apply decisions**, **Dismiss all**, or **Review later**.
6. Remove the control only after successful decision application or explicit
   dismissal.

Do not replace an unresolved proposal with a later automatic or manual run.

### 7. Make approval conflict-safe

Before applying:

- re-read the current character collection;
- reject an existing-character change when its current `updatedAt` differs
  from `baseUpdatedAt`;
- reject a new-character change if its ID or normalized/fuzzy canonical name
  now exists; and
- validate every confirmed change before one character-blob save.

Apply the confirmed subset atomically; dismissed characters are intentionally
omitted, while a runtime conflict must never cause a partial write within that
confirmed subset. Preserve `activeOverride` even when approving new detected
activity. Keep a conflicted proposal available so the user can read it, revise
decisions, or dismiss it.

### 8. Keep automatic work off the response critical path

Count only successfully saved, non-empty user turns. Do not count:

- assistant responses;
- regenerations;
- empty continuations; or
- failed user-message saves.

After saving an eligible user message, start maintenance without awaiting it,
then continue reasoning and response generation. Catch and log maintenance
errors inside the maintenance boundary.

### 9. Use one canonical cadence

Canonical settings:

```ts
characterSheetsAutoSyncEnabled?: boolean;
characterSheetsSyncInterval?: number;
characterSheetsMessagesSinceLastSync?: number;
characterSheetsTrailingMessageCount?: number;
```

Defaults and bounds:

- new chats: enabled;
- migrated chats: disabled until opt-in;
- interval: 3 saved user turns, clamped to 1–100;
- trailing messages: 5, clamped to 0–50.

Pending proposals pause cadence advancement so unresolved work cannot be
overwritten.

## Data model and migration

### Version 3 schema

```ts
interface CharacterDescription {
  id: string;
  name: string;
  appearance: string;
  sheetItems: string[];
  sheetSource?: "auto" | "manual";
  detectedActive: boolean;
  activeOverride?: boolean;
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}
```

### Migration algorithm

1. Read version 1, version 2, or version 3 records through a compatibility
   union.
2. Map legacy `description` to `appearance`.
3. Preserve existing `sheetItems` after trimming and de-duplication.
4. If legacy `sheet` is empty, use `[]`.
5. If every non-empty legacy line is a Markdown bullet or numbered bullet,
   remove markers and store individual items.
6. Otherwise preserve the complete trimmed prose as one item.
7. Default missing `detectedActive` to `true`.
8. Preserve preferred image and timestamps.
9. Save the migrated character blob.
10. Only after that save succeeds, update `charactersSchemaVersion` to `3`
    and normalize settings.

Do not infer semantic facts from legacy prose during migration. Lossless
preservation is safer than automatic rewriting.

Legacy setting and system-prompt fields remain read-only compatibility inputs
until the repository’s compatibility-retirement process permits removal.

## Model contracts

### Active Characters

Use a strict structured response:

```json
{
  "activeCharacterNames": ["Mara Venn", "Ivo"]
}
```

Rules:

- provide the canonical roster;
- use only the last 12 projected scene messages;
- accept known names through existing exact/high-confidence matching;
- accept at most three new names;
- require every new normalized name to appear in recent context;
- reject names resembling an existing canonical record rather than duplicating
  it; and
- reject malformed structured output rather than interpreting it as an empty
  cast.

### Character Sheet Update

Use a strict structured response:

```json
{
  "characters": [
    {
      "id": "character-id",
      "items": ["Concise durable fact"]
    }
  ]
}
```

Rules:

- send each requested ID, name, and complete current list;
- require every requested ID exactly once;
- reject missing, duplicate, or unknown IDs;
- allow an empty list when all previous facts are obsolete;
- allow at most ten items per character;
- allow at most 240 trimmed characters per item;
- reject blank and non-string items; and
- treat the response as a complete replacement, not a diff.

Expose separate System Prompts sections for Active Characters and Character
Sheet Update, each with prompt, model, and request settings.

## Service design

### Domain utilities

- `CharacterDescription.ts`
  - schema types, factories, migration, normalization, activity resolution.
- `CharacterNameMatcher.ts`
  - exact and high-confidence fuzzy canonical matching.
- `CharacterSheetSettings.ts`
  - canonical defaults, legacy reads, rounding, and bounds.
- `CharacterUpdateProposal.ts`
  - proposal/change types and change predicates.

Keep these utilities deterministic and free of I/O.

### Persistence services

- `CharacterDescriptionsService`
  - migrate/read/save records;
  - edit user-owned fields;
  - apply a selected, conflict-free proposal batch in one save.
- `CharacterUpdateProposalManagedBlob`
  - encrypted per-chat actionable proposal state.
- `CharacterUpdateProposalService`
  - read/save/subscribe/discard;
  - select confirmed character changes;
  - approve by delegating conflict checks and deleting only after success.

### Model services

- `ActiveCharacterSelectionService`
  - build recent-scene request and return normalized selection data only.
- `CharacterSheetSyncService`
  - build full-list requests and return validated replacement data only.

Neither model service persists character state.

### Orchestrator

`CharacterMaintenanceService`:

- normalizes enablement and cadence;
- serializes/coalesces overlapping runs;
- blocks when a proposal is pending;
- flushes pending character edits before per-character generation;
- runs selection before sheet update;
- compares proposed and current state;
- persists only non-empty proposals;
- contains automatic failures; and
- returns a small typed status for UI feedback.

## UI design

### Characters page

Place a separate settings panel at the top with:

- automatic synchronization switch;
- saved-user-turn cadence;
- context trailing-message count;
- **Prepare updates now**;
- Active Characters prompt shortcut; and
- Character Sheet Update prompt shortcut.

Each character card includes:

- name;
- effective Active switch;
- detected/override status and **Use automatic activity**;
- bullet-list editor with explicit add/delete;
- **Generate sheet** or **Update sheet**;
- appearance;
- preferred image model; and
- delete.

Manual sheet edits set `sheetSource: "manual"` and save directly because the
edit itself is the user’s approval. Model buttons create proposals.

### Quick Chat Controls

Add **Prepare Character Sheet Updates** alongside the existing quick actions.
Show loading and result status. Disable it while a proposal is pending.

The action invokes the same `synchronizeNow()` proposal path as the Characters
page. It never bypasses review.

### Async review

Show:

- source and actionable explanation;
- new-character badge;
- old and new automatic activity;
- current and proposed item lists;
- conflict or persistence errors;
- per-character **Confirm** and **Dismiss** decisions;
- **Apply decisions**, **Dismiss all**, and **Review later**.

### Flow

Replace the expanded preview/settings UI with one compact navigation button:

```text
Characters    N active / M total
```

## Context integration

At the central `LLMMessageContextService` boundary:

1. read approved character records;
2. filter by effective activity;
3. drop empty sheets;
4. format headings and explicit bullets;
5. place the result after memories and before the configured recent-message
   tail.

Apply this shared path to normal generation, reasoning, regeneration, chapter
work, book work, and Agent Flow. Never include appearance in text context.

## Delivery sequence

1. Introduce version 3 domain types, normalization, matching extraction, and
   migration tests.
2. Add canonical settings and chat-creation defaults.
3. Add strict active-selection and full-list sheet synchronization services.
4. Add proposal types, encrypted storage, approval, discard, and conflict
   checks.
5. Add the maintenance orchestrator and saved-user-turn trigger.
6. Filter central context by effective activity and structured sheet items.
7. Add dedicated system prompts and model settings.
8. Rebuild the Characters page and compact the Flow entry.
9. Add the Character Async Control and review modal.
10. Add the Quick Chat manual trigger through the same proposal path.
11. Retire direct-generation callers while retaining migration decoders.
12. Update documentation and run focused, full, type, lint, and build checks.

## Verification plan

### Domain and migration

- v1 description and v2 sheet migration;
- Markdown bullets versus lossless prose;
- normalization, de-duplication, and activity precedence;
- blob-before-version write order;
- migrated-chat opt-in behavior.

### Model boundaries

- recent-message selection;
- known alias normalization and unknown-name grounding;
- malformed active output rejection;
- complete sheet batch validation;
- duplicate, missing, and unknown ID rejection;
- blank, oversized, and excessive item rejection;
- prompt/model/request-setting selection.

### Orchestration and approval

- disabled, interval, due, and pending-proposal paths;
- active selection before sheet synchronization;
- manual override honored during synchronization;
- unchanged results produce no proposal;
- failures do not mutate records or block chat;
- proposal survives review closure/navigation;
- successful confirmed-set approval applies then deletes;
- an all-dismissed decision deletes without applying;
- mixed decisions apply only confirmed characters;
- stale records and new-name collisions prevent all writes.

### Context

- only effectively active records are included;
- user overrides win;
- empty sheets and appearance are excluded;
- bullets and trailing-message placement are correct;
- every context consumer uses the same rule.

### UI and integration

- compact Flow counts and navigation;
- accessible bullet controls and activity override reset;
- settings normalization and manual trigger status;
- Quick Chat trigger uses `synchronizeNow`;
- Async Control appears only for an actionable persisted proposal;
- review modal exposes per-character decisions, dismiss-all, and review-later;
- saved user messages start maintenance;
- regeneration and empty continuation do not.

## Completion criteria

- Model-generated activity and sheet changes cannot reach the character blob
  without explicit approval.
- Character Sheets are structured, identity-focused bullet lists.
- Active-cast filtering controls all text context paths.
- Automatic synchronization is configurable and non-blocking.
- Manual triggers on the Characters page and Quick Chat Controls share the same
  validation and approval pipeline.
- Migration is lossless, ordered, and opt-in safe.
- Invalid, failed, stale, or conflicting work leaves the last approved state
  unchanged.
- The dedicated Characters page owns configuration and editing; Flow stays
  compact.
- Relevant unit/integration tests, type-checking, linting, and build validation
  pass.
