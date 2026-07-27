# Continuity Histories

## Purpose

Continuity Histories are chat-scoped, versioned records for story state that is
neither character identity nor a global note: plot threads, places, objects,
factions, relationships, promises, mysteries, constraints, and world-state
changes.

The feature is disabled by default. Disabling it stops automatic maintenance,
selection requests, and context injection without deleting saved data.

## Data model

Each History contains:

- A title, subject description, kind, and routing hints.
- An inclusion mode: `automatic`, `always`, or `never`.
- An ordered revision log.
- For every revision, its origin, source message IDs, creation time, and the
  last story message it covers.

The per-chat `continuity-histories` managed blob stores both definitions and
settings. Normalization applies bounded defaults when older or partial data is
loaded.

## Maintenance

After each saved user turn, `ContinuityHistoryMaintenanceService` advances the
refresh counter. At the configured interval it:

1. Reads a bounded window of recent ordinary story messages.
2. Sends current History metadata and latest revisions to the configured model.
3. Validates the structured response and source message IDs.
4. Appends revisions only for materially changed subjects.
5. Optionally discovers new cross-scene subjects.

Automatic work runs without blocking the normal response. Users can also
refresh every History or one History from the management page. Manual edits
append revisions through the same temporal boundary model.

## Retrieval and context placement

`ContinuityHistoryContextService` selects records for the current scene.
`always` records bypass relevance selection, `never` records are suppressed,
and `automatic` records use either structured LLM selection or the local lexical
fallback. Only metadata, routing hints, and short latest-revision excerpts are
sent to the selector.

Selected records are rendered as one system message:

```text
# Relevant Continuity Histories

## History title
Latest applicable revision
```

The message floats before its independently configured recent-message tail.
Its placement does not change the Character Sheet offset:

```text
earlier projected history
Memories + Character Sheets at their configured boundary
selected Continuity Histories at their configured boundary
last N projected messages
generation instruction
```

Generation, reasoning, regeneration, and chapter-draft paths use the central
context document. Request traces expose selected History and revision IDs with
the selection reason.

## Temporal safety

Regeneration asks for context as it existed immediately before the regenerated
message. The selector resolves each History to the newest revision whose
`coveredThroughMessageId` is earlier than that boundary. A later revision is
never allowed to leak future story state into an earlier generation.

## Configuration

The management page at `/chat/:chatId/histories` exposes:

- Master enable/disable.
- Refresh interval and refresh lookback.
- Relevance lookback.
- Number of recent messages kept after the injected History block.
- Maximum number of automatically selected Histories.
- Automatic discovery and LLM relevance selection.
- Model and OpenRouter request settings.
- Refresh and relevance prompts.
- Per-History metadata, inclusion, generation, manual revision editing,
  deletion, and revision history.

Quick Chat Controls contains the master toggle and a link to the management
page.

## Services

- `ContinuityHistoriesManagedBlob` — encrypted persistence.
- `ContinuityHistoriesService` — settings, definitions, and manual revisions.
- `ContinuityHistoryMaintenanceService` — cadence, LLM refresh, discovery, and
  response validation.
- `ContinuityHistoryContextService` — relevance selection, temporal revision
  resolution, caching, and context rendering.
- `useContinuityHistories` — reactive UI subscription.
