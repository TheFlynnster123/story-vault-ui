# Plans Feature

## Overview

The Plans feature enables users to define AI-generated planning documents for their chats. Each plan has a name and a prompt that instructs the LLM to analyze the chat history and produce a structured Markdown document (e.g., key plot points, character arcs, timeline). Plans are automatically regenerated before each text response to keep them current.

## Pages

### `PlanPage`

A full-page editor for managing a chat's plans. Users can:
- Add new plans with a default name and prompt
- Edit plan names and prompts
- View generated plan content
- Delete plans with confirmation modals
- Changes auto-save via debounced persistence

## Components

### `PlanSection`

A compact, collapsible preview displayed in the chat's Flow accordion. Shows a count of plans with expandable previews of each plan's name, prompt, and generated content. Clicking navigates to the full `PlanPage`.

## Hooks

### `usePlanCache`

Subscribes to the `PlanService` for reactive updates and provides plan CRUD operations to components.

## Services

### `PlanService`

Per-chat service managing the plan lifecycle:
- Loads plans from blob storage on initialization
- Provides `getPlans()`, `addPlan()`, `deletePlan()` operations
- `updatePlanContent()` / `updatePlanDefinition()` — update generated content or user-defined fields
- `savePlans()` / `savePlansDebounced()` — persistence with optional debounce
- Observable pattern via `subscribe(callback)`

### `PlanGenerationService`

Generates updated plan content by sending the chat history and each plan's prompt to the Grok LLM. Called automatically during text generation (before the main response).

### `PlansManagedBlob`

Handles encrypted blob storage persistence for plans data.

### `Plan`

TypeScript interface:
```typescript
interface Plan {
  id: string;
  type: PlanType;    // "planning"
  name: string;
  prompt: string;
  content?: string;  // LLM-generated content
}
```

## Integration with Chat Generation

Plans are regenerated as part of the `TextGenerationService` flow:

1. User sends a message
2. `TextGenerationService` calls `PlanGenerationService.generateUpdatedPlans()`
3. Each plan's prompt + chat history is sent to Grok → updated Markdown content returned
4. Updated plans are saved
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
    PlanService.ts
    PlansManagedBlob.ts
```
