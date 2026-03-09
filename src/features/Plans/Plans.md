# Plans Feature

## Overview

The Plans feature enables users to define AI-generated planning documents for their chats. Each plan has a name and a prompt that instructs the LLM to analyze the chat history and produce a structured Markdown document (e.g., key plot points, character arcs, timeline). Plans are regenerated on a configurable cadence — users specify how many user messages should pass before the plan refreshes, avoiding unnecessary LLM calls.

**Plan content is stored as CQRS events in the chat timeline** — not as blob data. When a plan is generated, a `PlanCreated` event is emitted and the plan appears chronologically in the conversation. When a plan is regenerated, prior instances are hidden via `PlanHidden` events so only the latest is visible. This keeps plans positioned at the time they were generated, preventing the LLM from confusing plan content with recent conversation.

## Pages

### `PlanPage`

A full-page editor for managing a chat's plans. Users can:
- Add new plans with a rich default prompt
- Edit plan names and prompts
- Reset prompts to the default via a reset button
- Configure refresh interval (regenerate every N messages)
- See current refresh status (messages remaining until next refresh)
- **Generate a plan immediately** via the "Generate Now" button
- Delete plans with confirmation modals
- Changes auto-save via debounced persistence

## Components

### `PlanSection`

A compact, collapsible preview displayed in the chat's Flow accordion. Shows a count of plans with each plan's name and refresh status description. Clicking navigates to the full `PlanPage`.

### `PlanMessage`

Renders plan content in the chat timeline with a teal theme (matching `Theme.plan.primary`). Displays plan name as a header, content as rendered Markdown, and action buttons: Edit, Regenerate, Regenerate with Feedback, Delete.

## Hooks

### `usePlanCache`

Subscribes to the `PlanService` for reactive updates and provides plan CRUD operations to components.

## Services

### `PlanService`

Per-chat service managing plan **definitions** (not content):
- Loads plan definitions from blob storage on initialization (with migration for legacy plans)
- Provides `getPlans()`, `addPlan()`, `deletePlan()` operations
- `updatePlanDefinition()` — update user-defined fields (name, prompt, interval)
- `savePlans()` / `savePlansDebounced()` — persistence with optional debounce
- Observable pattern via `subscribe(callback)`

**Note**: Plan content is no longer stored in blob. The `content` field was removed from the Plan interface. Legacy plans with content are stripped via `applyPlanDefaults()`.

### `PlanGenerationService`

Manages plan refresh cadence and CQRS event creation:
- Checks each plan's `messagesSinceLastUpdate` against its `refreshInterval`
- Only regenerates plans that are due (counter >= interval)
- Increments counters for plans not yet due
- Resets counters to 0 after regeneration
- **Creates `PlanCreated` events** via `ChatService.AddPlanMessage()` (which also emits `PlanHidden` to hide prior instances)
- `generatePlanNow(plan)` — on-demand generation triggered by the "Generate Now" button
- `hasPlansNeedingRefresh()` — quick check used by TextGenerationService for status display

### `Plan` (Model & Utilities)

TypeScript interface and pure helper functions:
```typescript
interface Plan {
  id: string;
  type: PlanType;       // "planning"
  name: string;
  prompt: string;
  refreshInterval: number;          // Regenerate every N user messages (default: 5)
  messagesSinceLastUpdate: number;  // Counter since last regeneration
}
```

Utility functions: `applyPlanDefaults()`, `isDueForRefresh()`, `resetMessageCounter()`, `incrementMessageCounter()`, `formatRefreshStatus()`.

### `PlansManagedBlob`

Handles encrypted blob storage persistence for plan definitions.

## CQRS Events

### `PlanCreatedEvent`
Emitted when a plan is generated. Contains `messageId`, `planDefinitionId`, `planName`, and `content`. The plan appears as a distinct message in both UI and LLM projections.

### `PlanHiddenEvent`
Emitted before creating a new plan instance. Hides all prior messages for the same `planDefinitionId`. Uses a `hidden` boolean (distinct from `deleted` and `hiddenByChapterId`) to preserve event history.

## Integration with Chat Generation

Plans are processed as part of the `TextGenerationService` flow:

1. User sends a message
2. `TextGenerationService` checks `hasPlansNeedingRefresh()` to show status conditionally
3. `PlanGenerationService.generateUpdatedPlans()` processes each plan:
   - **Due plans** (counter >= interval): Regenerated via Grok LLM → `PlanHidden` + `PlanCreated` events emitted → counter reset to 0
   - **Not-due plans**: Counter incremented by 1
4. Plan definitions saved (counters updated)
5. Plans appear naturally in the LLM context from the `LLMChatProjection` — no separate plan injection needed

### LLM Context Formatting

In `LLMChatProjection`, plan messages are formatted with markers:
```
[Plan: Plan Name]
<plan content>
[End of Plan]
```
This helps the LLM distinguish plan content from conversation messages.

## Directory Structure

```
Plans/
  components/
    PlanSection.tsx
  hooks/
    usePlanCache.ts
  pages/
    PlanPage.tsx
  services/
    Plan.ts
    PlanGenerationService.ts
    PlanGenerationService.test.ts
    PlanService.ts
    PlansManagedBlob.ts
```
