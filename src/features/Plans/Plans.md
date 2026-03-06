# Plans Feature

## Overview

The Plans feature enables users to define AI-generated planning documents for their chats. Each plan has a name and a prompt that instructs the LLM to analyze the chat history and produce a structured Markdown document (e.g., key plot points, character arcs, timeline). Plans are regenerated on a configurable cadence — users specify how many user messages should pass before the plan refreshes, avoiding unnecessary LLM calls.

## Pages

### `PlanPage`

A full-page editor for managing a chat's plans. Users can:
- Add new plans with a rich default prompt
- Edit plan names and prompts
- Reset prompts to the default via a reset button
- Configure refresh interval (regenerate every N messages)
- See current refresh status (messages remaining until next refresh)
- View generated plan content
- Delete plans with confirmation modals
- Changes auto-save via debounced persistence

## Components

### `PlanSection`

A compact, collapsible preview displayed in the chat's Flow accordion. Shows a count of plans with expandable previews of each plan's name, refresh status, and generated content. Clicking navigates to the full `PlanPage`.

## Hooks

### `usePlanCache`

Subscribes to the `PlanService` for reactive updates and provides plan CRUD operations to components.

## Services

### `PlanService`

Per-chat service managing the plan lifecycle:
- Loads plans from blob storage on initialization (with migration for legacy plans missing new fields)
- Provides `getPlans()`, `addPlan()`, `deletePlan()` operations
- `updatePlanContent()` / `updatePlanDefinition()` — update generated content or user-defined fields
- `savePlans()` / `savePlansDebounced()` — persistence with optional debounce
- Observable pattern via `subscribe(callback)`

### `PlanGenerationService`

Manages plan refresh cadence:
- Checks each plan's `messagesSinceLastUpdate` against its `refreshInterval`
- Only regenerates plans that are due (counter >= interval)
- Increments counters for plans not yet due
- Resets counters to 0 after regeneration
- `hasPlansNeedingRefresh()` — quick check used by TextGenerationService for status display

### `Plan` (Model & Utilities)

TypeScript interface and pure helper functions:
```typescript
interface Plan {
  id: string;
  type: PlanType;       // "planning"
  name: string;
  prompt: string;
  content?: string;     // LLM-generated content
  refreshInterval: number;          // Regenerate every N user messages (default: 5)
  messagesSinceLastUpdate: number;  // Counter since last regeneration
}
```

Utility functions: `applyPlanDefaults()`, `isDueForRefresh()`, `resetMessageCounter()`, `incrementMessageCounter()`, `formatRefreshStatus()`.

### `PlansManagedBlob`

Handles encrypted blob storage persistence for plans data.

## Integration with Chat Generation

Plans are processed as part of the `TextGenerationService` flow:

1. User sends a message
2. `TextGenerationService` checks `hasPlansNeedingRefresh()` to show status conditionally
3. `PlanGenerationService.generateUpdatedPlans()` processes each plan:
   - **Due plans** (counter >= interval): Regenerated via Grok LLM, counter reset to 0
   - **Not-due plans**: Counter incremented by 1
4. All plans saved (whether regenerated or just counter-updated)
5. Plans are included in the LLM context for the main response generation

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
