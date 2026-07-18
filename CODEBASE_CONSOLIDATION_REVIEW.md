# Codebase Consolidation & Complexity Review

Reviewed July 9, 2026 against the current `src/` tree. This is a planning
document, not a request to rewrite working features. It prioritizes places
where the same product concept is represented in several live code paths or
where adding one behavior requires editing too many files.

## Executive summary

The application has solid feature boundaries and useful tests, but the image
and AI-workflow areas are carrying two generations of architecture at once.
The highest-value work is to finish those migrations, retaining read
compatibility at the persistence boundary rather than keeping parallel UI,
service, and event implementations indefinitely.

The next most valuable consolidation is a small set of shared AI-context and
action-definition primitives. Those reduce drift without turning every prompt
or workflow into a generic framework.

| Priority | Recommendation | Why it matters | Suggested scope |
| --- | --- | --- | --- |
| Done | Retire legacy per-chat image models | Legacy settings now migrate at the storage boundary; the old UI and CRUD paths have been removed. | Completed July 18, 2026 |
| P1 | Collapse `CivitJob` and `CivitWorkflow` event shapes | New image generation writes workflow events, while projections, UI, services, and tests still support both. | One migration/release train |
| P1 | Centralize LLM context serialization and prompt-envelope assembly | The same history formatting and message-append rules are repeated in generation features. | Small, well-tested library extraction |
| P1 | Parameterize the duplicate image-model editor | The global and per-chat editors differ chiefly by repository and route details. | Small refactor |
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
legacy pages, hook, CRUD service, and event writers have been removed.

The image feature documentation explicitly identifies `useChatImageModels`,
`ChatImageModel*Page`, `ChatImageModelService`, and
`ChatImageModelsManagedBlob` as legacy and superseded by variants
([`src/features/Images/Images.md`](src/features/Images/Images.md)). They are
nevertheless still routed from [`src/App.tsx`](src/App.tsx), and the legacy
service/hook remain a complete CRUD implementation:

- [`ChatImageModelService.ts`](src/features/Images/services/ChatImageModelService.ts)
  duplicates much of the global
  [`ImageModelService.ts`](src/features/Images/services/modelGeneration/ImageModelService.ts)
  contract: load, classify, save/upsert, delete, select, migrate, subscribe,
  and default fallback.
- [`useChatImageModels.ts`](src/features/Images/hooks/useChatImageModels.ts)
  duplicates the load/error/subscription/optimistic-state shape in
  [`useChatImageVariants.ts`](src/features/Images/hooks/useChatImageVariants.ts).
- `ChatImageModelEditPage` and `ImageModelEditPage` are nearly the same editor
  with a different storage service and navigation target.

Keeping this feature family visible makes every image-model change answer two
questions: “does this belong on a copied per-chat model or a variant?” and
“which selection state wins?” The newer variant model is a better long-term
representation because it stores only per-chat overrides over a system model.

**Recommended end state**

Keep system models plus per-chat variants; remove the legacy per-chat model
routes, pages, hook, service, managed blob accessor, and their compatibility
tests after data has migrated. The only legacy-aware code should be a
one-time/read-time migration at the storage boundary, with a telemetry or
explicit user-visible report for records that cannot be converted.

**Safe migration sequence**

1. Inventory legacy `chat-image-models` blobs and classify each model with the
   existing `LegacyImageModelWorkflowConverter`.
2. For each selected legacy model, create either a variant or a selected system
   model record. Preserve the legacy model as a temporary fallback only when no
   equivalent system model can be resolved.
3. Read legacy data only when the new variant blob is absent; write only the
   variant representation.
4. Remove the legacy routes from `App`, then delete the legacy UI/service/hook
   after a defined compatibility window.
5. Add migration fixtures covering workflow models, unconvertible legacy
   models, selection fallback, and idempotent re-runs.

Do not replace the two implementations with a larger generic “model manager”
while both concepts remain. The desired consolidation is deletion, not a third
abstraction that preserves both concepts forever.

### 2. Collapse the duplicate image job/workflow event model

**Priority: P1 — compatibility burden crosses the event-store boundary.**

**Status: active generation migrated.** Legacy `CivitJob*` payloads are
normalized to `CivitWorkflow*` events when replayed. Projections, image
generation, and chat rendering now operate on the workflow shape; the legacy
event interfaces remain only for persisted-history compatibility.

`ChatEvent` defines parallel `CivitJobCreated`/`CivitJobUpdated` and
`CivitWorkflowCreated`/`CivitWorkflowUpdated` events with effectively the same
metadata in [`ChatEvent.ts`](src/services/CQRS/events/ChatEvent.ts). The same
parallelism appears in event utilities, `ChatService`, `UserChatProjection`,
`ImageGenerationService`, `CivitJobMessage`, and their tests. The active image
generation flow creates and updates workflow events; the job forms are retained
to replay historical data.

This adds branching at exactly the most fragile point in the app: persisted,
encrypted event replay. For example, the image generation service must accept
both projected message types and choose the matching update method, while the
LLM projection has four no-op cases for image events.

**Recommended end state**

Adopt one persisted image-generation event family, named for the current
workflow API. Convert legacy events to that canonical in-memory form during
event deserialization/replay; all projections and UI should receive only that
canonical type.

**Safe migration sequence**

1. Add a pure `normalizeChatEvent(event)` compatibility adapter at the event
   store boundary. It maps old job events/fields to canonical workflow events
   without changing saved history.
2. Change projections and UI to consume only the canonical projected image
   message type. Keep replay fixtures for old event payloads.
3. Stop exposing legacy `CreateCivitJob` and `UpdateCivitJob` methods to new
   production callers.
4. Once old event replay is covered and the compatibility period is complete,
   remove legacy event writers, types, utilities, and branches.

This is not a database rewrite: events are encrypted and append-only, so a
read-time adapter is safer than attempting bulk mutation of stored history.

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

**Priority: P1 — low-risk, concrete deletion.**

[`ImageModelEditPage.tsx`](src/features/Images/pages/ImageModelEditPage.tsx)
and [`ChatImageModelEditPage.tsx`](src/features/Images/pages/ChatImageModelEditPage.tsx)
contain the same loading, editing, migration, deletion-confirmation, and form
sections. Their differences are mostly these injected concerns:

- global versus chat-scoped model repository;
- save/delete/select method names;
- back route and page wording;
- a small amount of theme styling.

Extract the shared screen as `ImageModelEditor` with a narrow repository
interface (`get`, `save`, `remove`, `migrate`, `flush`) and navigation/page
configuration. Keep route-specific containers thin. If finding 1 removes
legacy chat models, this extraction can be deferred until after that deletion;
otherwise, do it first to prevent changes from landing twice.

The editor should be protected by one shared interaction test suite plus two
small container tests for repository binding and navigation.

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

1. Add outbound-message snapshot fixtures, legacy event-replay fixtures, and
   model/blob migration fixtures before behavior-changing work.
2. Extract the pure LLM context builder and migrate callers one by one.
3. Normalize legacy image job events at replay, then remove legacy event paths
   from active generation.
4. Migrate per-chat legacy models to variants and remove legacy routes/code.
   If the legacy UI must remain temporarily, first share the model editor.
5. Convert discussion routes and Agent Flow actions to descriptors/catalogs.
6. Establish chat-session disposal; use that boundary when narrowing the
   dependency locator and splitting the image-generation state machine.
7. Split large pages opportunistically alongside feature changes, with no
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

`npm run lint` currently fails with 191 errors and 13 warnings, largely
`no-explicit-any` violations in tests plus several production issues (including
legacy image-model files). This is important, but it should be a separate
baseline cleanup or deliberately scoped workstream; combining it with the
consolidations above would obscure behavioral changes. New/modified code in the
consolidation work should remain lint-clean, and each migration should run its
focused tests plus the relevant build/type-check command.
