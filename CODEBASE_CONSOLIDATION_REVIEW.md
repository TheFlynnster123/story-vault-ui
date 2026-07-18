# Codebase Consolidation & Complexity Review

Originally reviewed July 9, 2026; updated July 18, 2026 after completing the
legacy image consolidation. This is a planning document, not a request to
rewrite working features. It prioritizes places
where the same product concept is represented in several live code paths or
where adding one behavior requires editing too many files.

## Executive summary

The application has solid feature boundaries and useful tests. The two largest
image-architecture duplications identified in the original review are now
resolved: per-chat copied models have been replaced by variants, and legacy
image job events are normalized at replay into the workflow event shape.
Compatibility is retained only at persistence boundaries.

The next most valuable consolidation is a small set of shared AI-context and
action-definition primitives. Those reduce drift without turning every prompt
or workflow into a generic framework.

| Priority | Recommendation | Why it matters | Suggested scope |
| --- | --- | --- | --- |
| Done | Retire legacy per-chat image models | Legacy settings now migrate at the storage boundary; the old UI and CRUD paths have been removed. | Completed July 18, 2026 |
| Done | Collapse `CivitJob` and `CivitWorkflow` event shapes | Legacy payloads normalize at replay; active code consumes and writes workflow events only. | Completed July 18, 2026 |
| P1 | Centralize LLM context serialization and prompt-envelope assembly | The same history formatting and message-append rules are repeated in generation features. | Small, well-tested library extraction |
| Done | Remove the duplicate per-chat image-model editor | Deleting the superseded per-chat model feature removed the duplicate editor entirely. | Completed July 18, 2026 |
| P2 | Make discussion routes/configuration data-driven | Six route wrappers and several config factories repeat the same lifecycle. | Incremental feature refactor |
| P2 | Define Agent Flow actions once | A new agent tool currently requires synchronized enum/schema/fallback/UI-executor changes. | Incremental feature refactor |
| P2 | Add an explicit chat-session lifecycle | Per-chat singleton caches retain state, timers, and subscribers without eviction. | Design + lifecycle change |
| P3 | Split oversized page/controller files by responsibility | Several files contain independent views, state orchestration, and utilities. | Opportunistic during feature work |
| P3 | Reduce reliance on the global service locator | It makes dependency ownership and tests broader than necessary. | Incremental, not a rewrite |
| P3 | Lazy-load route-level feature bundles | The production bundle is a single large entry chunk. | Isolated routing/build change |

## Findings

### 1. Finish the per-chat image-model migration

**Priority: P1 — high duplication, meaningful deletion opportunity.**

**Status: completed.** When a chat has no variant blob, its older
`chat-image-models` blob is converted to variants. Successful migrations remove
the obsolete blob; partial migrations retain it for recovery and expose a
user-facing fallback notice. Old URLs redirect to the variant page, and the
legacy pages, hook, and CRUD service have been removed.

The retained compatibility surface is intentionally small:

- `LegacyChatImageModelsMigration` reads the old blob only when no variant blob
  exists, converts usable records, and persists the canonical representation.
- `ChatImageModelsManagedBlob` remains as a read/delete accessor for that
  migration boundary; active image generation does not use it.
- Complete migrations delete the obsolete blob. Partial migrations retain it
  for recovery, log the failed records, show a user-facing notice, and safely
  fall back to a workflow-compatible system model.
- Legacy `/image-models/*` chat URLs redirect to `/image-variants`.

Migration, fallback, selection validation, and cleanup behavior are covered by
the image-variant service tests.

### 2. Collapse the duplicate image job/workflow event model

**Priority: P1 — compatibility burden crosses the event-store boundary.**

**Status: completed.** Legacy `CivitJob*` payloads are
normalized to `CivitWorkflow*` events when replayed. Projections, image
generation, and chat rendering now operate on the workflow shape; the legacy
event interfaces remain only for persisted-history compatibility.

`normalizeChatEvent` is the sole translation point for encrypted historical
events. Legacy writer utilities, `ChatService` methods, projected
`civit-job` messages, service branches, and UI unions have been removed.
Replay fixtures verify both legacy creation and update payloads. This remains
a read-time conversion rather than a destructive rewrite of append-only
history.

### 3. Extract shared LLM context and prompt-envelope assembly

**Priority: P1 — prevents prompt behavior from drifting.**

The exact `LLMMessage[]`-to-labeled-text formatter named
`consolidateMessagesToString` exists in both
[`LLMMessageContextService.ts`](src/features/Chat/services/ChatGeneration/LLMMessageContextService.ts)
and [`PlanGenerationService.ts`](src/features/Plans/services/PlanGenerationService.ts).
Both then construct variations of a `Chat History … --- … instruction` system
message. Similar, slightly different “append prompt to context” routines occur
in image prompt generation, character descriptions, plan suggestions, and
discussion configuration.

This is a semantic duplication risk, not merely a style issue: role labels,
message order, whether memories sit before or after history, and system versus
user prompt role all affect LLM behavior. Regeneration already has a distinct
history-truncation path, reinforcing that context assembly deserves one
deliberate owner.

**Recommended end state**

Create a small, pure `LLMContextBuilder` module that owns:

- rendering labeled transcript text;
- appending a prompt as a system or user message;
- wrapping a transcript with named sections;
- truncating only the conversation portion before later context sections are
  appended.

It should accept explicit data and return `LLMMessage[]`; it should not read
settings, call APIs, or contain feature prompt text. Feature services continue
to choose their own prompt wording, model, request settings, and which context
sections are applicable.

**Migration/verification**

Move one consumer at a time and snapshot the final outbound messages for
generation, reasoning (consolidated and non-consolidated), plan generation,
plan update, and regeneration. Preserve the existing message role/order unless
a separately reviewed product change is intended. This is especially important
for regeneration: truncate history first, then append stable context such as
memories or character sheets.

### 4. Use one configurable image-model editor

**Status: resolved by deletion.** The superseded
`ChatImageModelEditPage` was removed with the per-chat copied-model feature.
`ImageModelEditPage` remains the system-model editor, while
`ChatImageVariantEditPage` edits the intentionally different override
representation. A generic editor abstraction is no longer recommended.

### 5. Make discussion pages and repeated summary configurations declarative

**Priority: P2 — repeated lifecycle wiring.**

The six `Discuss*Page.tsx` files each do the same work: read URL values, load
system prompts, create a `DiscussionService` with `useMemo`, render a loader,
and render `DiscussionPage`. The chapter and book configuration factories have
parallel “existing summary” and “new summary” variants with repeated prompt
resolution, default model settings, response calls, and feedback envelope
construction.

The existing `DiscussionConfig` is already the right seam. Extend that design
rather than introducing another generic chat component:

1. Define route descriptors containing page copy/theme, parameter parsing, and
   a config factory.
2. Render all standard routes through one `DiscussionRoute` container that
   owns prompt loading, missing-parameter handling, loading state, and service
   construction.
3. Extract a focused `createSummaryDiscussionConfig` helper for the shared
   chapter/book behavior; keep Plan and Story configurations custom, since
   their context and persistence actions differ materially.

Use tests to lock the generated request messages and the final
`Add…`/`Edit…` action for each descriptor. Avoid erasing copy or product-level
differences just to make the descriptors look uniform.

### 6. Create a single Agent Flow action catalog

**Priority: P2 — an action addition has too many synchronization points.**

Agent Flow declares tool names in a TypeScript union, repeats them in the JSON
schema, maps intents to fallback actions, validates raw LLM output, and handles
them again in the `executeAction` switch in
[`AgentFlowSection.tsx`](src/features/Chat/components/Chat/Flow/AgentFlowSection.tsx).
The section also owns the action-specific note/chapter/clarification modal
state. The service repeats intent/action mappings in
[`AgentFlowService.ts`](src/features/Chat/services/AgentFlow/AgentFlowService.ts).

Define an `AgentActionDefinition` catalog as the source of truth for each
tool: schema metadata, title/label, fallback constructor, argument parser, and
executor or “open draft” behavior. Derive the LLM schema and type guards from
that catalog, while keeping permissions/confirmation policy explicit in each
definition.

This turns “add a tool” into one definition plus focused tests and makes it
harder for the model schema to advertise a tool that the UI cannot execute.
Keep draft-modal rendering separate from pure normalization/execution code;
the current component is otherwise both an orchestration controller and a
large presentation component.

### 7. Add eviction and reset to per-chat singleton caches

**Priority: P2 — lifecycle complexity and memory/privacy concern.**

[`createInstanceCache`](src/services/Utils/getOrCreateInstance.ts) keeps a
module-level `Map` with no `clear`, `delete`, or disposal mechanism. It backs
at least the event service, both projections, chat settings, plans, generation
services, image services, agent flow, and managed blobs. Several cached values
hold subscribers, fetched/decrypted content, pending saves, or intervals;
`ImageGenerationService` additionally registers unload-related lease behavior.

Navigation between chats therefore accumulates service instances for the full
page lifetime. Logout does not explicitly clear those caches or the cached
encryption manager, either.

Introduce a `ChatSessionRegistry` (or extend the cache utility) with explicit
`dispose(chatId)` and `disposeAll()` operations. Services that own resources
should implement an optional `dispose()` method to unsubscribe, flush/cancel
work according to policy, and release timers. Trigger session cleanup on chat
switches when safe and always on logout/authentication changes.

Do not add automatic least-recently-used eviction until in-flight generation
ownership is understood; a premature eviction could abandon a resumable
workflow. First make lifecycle ownership observable and test it.

### 8. Split large controller/page files around real responsibilities

**Priority: P3 — improves change isolation without changing behavior.**

Several files have become mini-features:

- [`CreditsPage.tsx`](src/features/OpenRouter/pages/CreditsPage.tsx) combines
  request filtering/sorting/aggregation, clipboard debug export, presentation,
  and styling in one roughly 1,100-line page.
- [`PlanPage.tsx`](src/features/Plans/pages/PlanPage.tsx) contains route state,
  presets, generation commands, editor controls, list views, and visual
  components in one roughly 1,000-line module.
- [`AgentFlowSection.tsx`](src/features/Chat/components/Chat/Flow/AgentFlowSection.tsx)
  mixes subscription state, action orchestration, draft workflows, modals, and
  rendering.
- [`ImageGenerationService.ts`](src/features/Chat/services/ChatGeneration/ImageGenerationService.ts)
  owns a resumable state machine, leases/heartbeats, character resolution,
  prompt generation, workflow submission, event mutation, and error recovery.

Split at testable seams, not into generic “utils” folders:

- pure selectors/formatters (`requestMonitoringSelectors`, `planPresetRules`);
- view components with explicit props;
- resource/state adapters (`useAgentFlow`, `useImageGeneration`);
- image-generation collaborators such as `GenerationLeaseManager`,
  `CharacterContextResolver`, and `WorkflowGenerationRunner`.

For the image service, preserve one orchestrator that owns status transitions
and event writes. The goal is not to distribute the state machine across UI
components; it is to make each transition and side effect independently
testable.

### 9. Incrementally narrow the global service locator

**Priority: P3 — cross-cutting, do not rewrite all at once.**

[`Dependencies.ts`](src/services/Dependencies.ts) imports and constructs
services from nearly every feature. Most service tests mock that module, which
means a unit's direct dependencies are not visible in its constructor or hook
signature. This is convenient initially, but it grows the central dependency
graph and makes service lifecycle changes harder.

Keep `d` as a composition root during a transition, but stop expanding it:

1. New/refactored pure services should take narrow interfaces in their
   constructors (for example, an LLM client, projections, and settings reader).
2. React hooks should receive a stable feature facade or use a feature-level
   provider where lifecycle matters.
3. Migrate only the high-churn areas above first: context building, Agent
   Flow, and image generation.

This will make tests use small typed fakes instead of broad module mocks. It is
not worth converting straightforward blob wrappers solely for architectural
purity.

### 10. Split route-level bundles along existing feature boundaries

**Priority: P3 — delivery complexity, independent of the domain refactors.**

The production build currently emits one `index` JavaScript asset of about
1.28 MB uncompressed (about 380 kB gzip) and Vite reports its standard
large-chunk warning. [`App.tsx`](src/App.tsx) imports every page eagerly,
including large, infrequently opened management screens such as credits, plan
editing, image-model editing, and discussion pages.

Use `React.lazy`/`Suspense` for route-level pages, starting with low-frequency
settings and management routes. Keep the chat path and its immediately needed
components eager if that provides the best interactive load path. Verify the
change with route-navigation smoke tests and a bundle report; do not introduce
manual chunks before observing what route-level splitting actually produces.

## Recommended delivery order

Completed July 18, 2026:

- legacy image event replay fixtures and canonical normalization;
- removal of active legacy image event paths;
- automatic per-chat model-to-variant migration and migration fixtures;
- deletion of legacy per-chat routes, pages, hook, and CRUD service.

Remaining recommended order:

1. Extract the pure LLM context builder and migrate callers one by one.
2. Convert discussion routes and Agent Flow actions to descriptors/catalogs.
3. Establish chat-session disposal; use that boundary when narrowing the
   dependency locator and splitting the image-generation state machine.
4. Split large pages opportunistically alongside feature changes, with no
   behavior-only “big bang” rewrite; then lazy-load the resulting route-level
   boundaries.

## Guardrails and non-recommendations

- Keep `UserChatProjection` and `LLMChatProjection` separate. They intentionally
  model different views of event history; sharing their event switch mechanics
  would save little and risk conflating UI visibility with model context.
- Keep `ManagedBlob` as the common persistence primitive. Its existing
  `createManagedBlob` / `createGlobalManagedBlob` factories already removed the
  otherwise repetitive subclass layer. Do not reintroduce wrappers merely for
  naming consistency.
- Do not create one universal prompt factory. Share message mechanics, not
  feature-specific prompt language or business decisions.
- Treat encrypted stored events and user content as compatibility-sensitive.
  Use read-time normalization and idempotent migrations; avoid destructive bulk
  changes unless recovery and verification are established.

## Quality baseline to address separately

The July 9 lint counts are no longer a reliable baseline and should be
remeasured as a separate cleanup workstream. The legacy image production files
called out in the original baseline have been removed. The completed image
consolidation passed 1,277 non-stress tests, the production build, focused
linting of modified production files, and `git diff --check`.
