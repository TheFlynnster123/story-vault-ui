# Chapter Creation

## Status

Implemented and consolidated.

Chapter creation starts with three choices:

1. **Generate** — captures the chapter boundary, starts one background draft
   request, and returns the user to chat.
2. **Discuss** — opens the ephemeral discussion flow and stages its result for
   review.
3. **Manual** — opens a blank chapter draft.

Every path uses the same recoverable review editor. A chapter is not committed
until the user selects **Create Chapter**.

## Current Flow

### Generate

1. Capture the visible LLM messages used by generation.
2. Capture the exact user-facing message IDs the chapter may cover.
3. Persist the pending draft locally.
4. Close the creation modal and show non-blocking progress.
5. Build memories, character sheets, settings, and both chapter prompts once.
6. Make one model request for a structured `{ title, summary }` response.
7. Persist the completed draft.
8. Show a chapter-themed **Review chapter draft** Async Control beneath Quick
   Chat Controls.
9. Create the chapter with only the captured message IDs after user review.

The review editor no longer opens automatically over an active conversation.
Failed requests remain available through **Retry chapter**.

### Discuss

The discussion remains ephemeral and does not write transient messages to chat
history. Its accepted or generated summary is persisted as a ready chapter
draft. Returning to chat displays **Review chapter** without interrupting the
user.

### Manual

Manual creation opens the shared editor with blank fields and the current
covered-message boundary. Closing the editor retains the draft. The user must
explicitly select **Discard Draft** or create the chapter to remove it.

### Agent Flow

Agent chapter suggestions always open the shared editor, including suggestions
that already contain both title and summary. Agent Flow no longer owns chapter
state, renders a separate modal, performs sequential generation, or commits a
chapter directly.

## Architecture

- `ChapterCreationProvider` owns the controller, discussion navigation, and
  creation modal for one chat page.
- `ChapterCreationContext` exposes the shared controller to Quick Controls,
  Flow Controls, and Agent Flow.
- `AsyncActionControl` provides the shared attention and approval pattern
  documented in `AsyncControls.md`.
- `useAddChapter` coordinates draft state, generation, recovery, retry,
  validation, and persistence.
- `ChapterCreationDraft` owns the persistent draft schema, storage, validation,
  covered-message selection, and same-tab change subscription.
- `ChapterEditorModal` is shared by chapter creation and chapter editing.
- `LLMMessageContextService.buildChapterDraftRequestMessages` assembles shared
  context and both configured prompts once.
- `ChapterGenerationService.generateChapterDraft` performs one request and
  validates its structured response.
- `ChatService.AddChapter` accepts deduplicated explicit covered message IDs.

## Value Added

### Consistent behavior

Quick Controls, Flow Controls, Discuss, Manual, Generate, and Agent Flow all
share the same draft and commit boundary.

### Recoverable work

Ready, generating, and failed drafts are stored in `localStorage`. Drafts
survive modal closure, route changes, and page refresh. A same-tab subscription
keeps a remounted chat page synchronized when an older in-flight request
finishes.

### Lower latency and cost

Title and summary generation changed from two independent model calls to one
structured request. Common settings, memories, character sheets, and prompts
are loaded once.

### Less code

The consolidation removed:

- Agent Flow's chapter state, submit path, generation path, and modal wiring.
- The pass-through `ChapterCreation` component.
- `EditChapterModal` and its duplicated form markup.
- Standalone `generateChapterTitle` and `generateChapterSummary` operations.
- Separate chapter title and summary context builders.
- The unused chapter-title model and request-settings configuration.

### Stronger failure handling

- Invalid JSON and incomplete model responses are rejected explicitly.
- Failed generation is retained for retry.
- Failed create/edit operations leave the editor and draft intact.
- Storage failures do not crash the workflow.
- Covered message IDs are deduplicated before persistence.

## Remaining Critique

### Snapshot capture is still not atomic

Covered user-message IDs and LLM messages are read from two projections in
sequence. A persisted or streaming event between those reads could create a
narrow mismatch. A future projection API should return both views at one event
store position.

### Local persistence has practical limits

`localStorage` is appropriate for one recoverable text draft, but a very large
context snapshot can exceed browser quota. Drafts are device-local and are not
encrypted or synchronized. Moving pending drafts to managed blob storage would
be appropriate if cross-device recovery becomes a requirement.

### Empty-context generation is allowed

Generate and Discuss can start with no eligible messages. Manual empty-boundary
chapters may be useful, but AI compression should be disabled or confirmed
when the covered-message count is zero.

### In-flight requests cannot be cancelled

Changing chats does not cancel a request. Persisted state makes completion
recoverable, but adding `AbortSignal` support would avoid unnecessary cost when
the user explicitly discards a generating draft.

### Structured output is prompt-enforced

The response parser is strict and accepts plain or fenced JSON, but the
OpenRouter call does not currently use a JSON schema response format. Migrating
the request to the structured-chat API would make provider behavior more
reliable.

## Next Value Adds

Prioritized:

1. Capture both projections at one event-store version.
2. Disable or confirm AI generation for an empty snapshot.
3. Use schema-enforced structured output.
4. Add cancellation when discarding an in-flight draft.
5. Show the captured message count and boundary in the review editor.
6. Move drafts to managed storage only if cross-device recovery is desired.

## Test Coverage

Focused coverage includes:

- Generate, Discuss, and Manual choice behavior and ordering.
- Shared editor validation.
- Agent Flow routing into the shared editor.
- Recoverable storage, malformed data, failures, subscriptions, and discard.
- Non-interrupting background completion and pending-draft state.
- Failed generation and retry.
- Immutable LLM and covered-message snapshots.
- Discuss-to-review handoff.
- Single-request structured draft generation and parsing.
- One-time shared context assembly.
- Explicit and deduplicated covered IDs.
- Loading-state cleanup after request failures.

Future tests should cover atomic projection snapshots, empty-context policy,
schema-enforced responses, cancellation, and storage quota fallback.
