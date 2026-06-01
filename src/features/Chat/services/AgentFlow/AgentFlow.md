# Agent Flow

## Overview

Agent Flow adds a small agentic layer to the chat Flow panel. It does not run autonomously in the background. The user starts it from the **Agent Flow** control.

There are two entry points:

- **Tap Agent Flow**: asks the model to inspect the current chat and choose the most useful intent.
- **Long-press Agent Flow**: opens a manual intent picker, then asks the model to generate actions for the selected intent.

The model returns a structured `AgentFlowSuggestion`:

```ts
interface AgentFlowSuggestion {
  intent:
    | "continue_chat"
    | "update_memory"
    | "generate_image"
    | "refresh_plan"
    | "create_chapter"
    | "add_note"
    | "ask_user";
  confidence: number;
  rationale: string;
  proposedActions: AgentFlowAction[];
}
```

Suggestions are shown in the Flow panel. Nothing mutates chat state until the user clicks the action button.

The Agent Flow row has a settings icon that opens the per-chat Agent Flow settings page. That page owns automatic analysis cadence and intent boldness.

## Defaults and Configuration

Agent Flow uses the system prompt fields:

- `agentIntentPrompt`
- `agentIntentModel`

The default model is:

```txt
x-ai/grok-4.3
```

These are editable on the System Prompts page.

## Structured Output

Agent Flow calls `OpenRouterChatAPI.postStructuredChat()` with a strict JSON schema and `provider.require_parameters: true`.

The frontend also enables a narrow fallback for Agent Flow. If the backend/model returns a bare intent string such as `update_memory`, the UI converts it into a low-confidence suggestion instead of throwing.

## Manual Intents

The manual picker currently offers:

- `update_memory`
- `generate_image`
- `refresh_plan`
- `create_chapter`
- `add_note`
- `ask_user`
- `continue_chat`

Selecting an intent does not immediately mutate chat state. It constrains the model request so the model returns concrete `proposedActions` for that intent when possible.

If the model returns an intent without actions, Agent Flow creates a fallback action for manually selected or bare-string intents where a reasonable local behavior exists.

## Auto Run

Per-chat settings:

```ts
{
  agentFlowAutoRunEnabled?: boolean;
  agentFlowAutoRunInterval?: number;
  agentFlowMessagesSinceLastRun?: number;
  agentFlowSensitivity?: number;
}
```

Behavior:

- The user opens Agent Flow settings from the settings icon on the Agent Flow row.
- The user enables Auto from the settings page.
- The user adjusts the cadence with the message interval control.
- After a saved user message, the counter increments.
- When the counter reaches the configured interval, Agent Flow analyzes the chat and resets the counter.
- Auto-run updates the suggestion shown in the Flow panel. It does not run actions.

## Intent Boldness

`agentFlowSensitivity` is a per-chat number from 0 to 100:

- `0-33`: Conservative. Only suggest actions when the benefit is strong and obvious.
- `34-66`: Balanced. Suggest actions when they are likely useful.
- `67-100`: Proactive. Prefer useful workflow actions and use `ask_user` when details are missing.

The default is `50`, which is Balanced.

## Actions

### `save_memory`

Purpose: persist durable context for future generation.

Expected args:

```ts
{
  content: string;
}
```

Run behavior:

- If `content` is present, saves a new memory through `MemoriesService.saveMemory()`.
- If `content` is missing, navigates to the Memories page.

User-visible result:

- Saved memories are injected into later chat generation context.

### `generate_image`

Purpose: start the existing image-generation workflow for the current chat state.

Expected args:

```ts
{}
```

Run behavior:

- Calls `ImageGenerationService.generateImage()`.
- The existing image pipeline handles character selection, missing character description handling, prompt generation, and Civit workflow submission.
- If a manually selected image intent produces no model action, Agent Flow creates a fallback image-generation action.

User-visible result:

- A pending image workflow message appears in chat.

### `refresh_plan`

Purpose: regenerate a specific plan.

Expected args:

```ts
{
  planId?: string;
  planDefinitionId?: string;
}
```

Run behavior:

- If a plan id is present, calls `PlanGenerationService.generatePlanNow(planId)`.
- If no plan id is present, navigates to the Plans page.

User-visible result:

- A regenerated plan appears in chat when the plan id is valid.

Current limitation:

- The action depends on the model knowing or receiving a valid plan id. If it only knows that “a plan should be refreshed,” it opens the Plans page instead.

### `create_chapter`

Purpose: create a chapter compression boundary.

Expected args:

```ts
{
  title: string;
  summary?: string;
}
```

Run behavior:

- If both `title` and `summary` are present, calls `ChatService.AddChapter(title, summary)`.
- If either `title` or `summary` is missing, opens the existing Create Chapter modal prefilled with any agent-provided values.

User-visible result:

- A chapter message appears in chat and prior covered messages are hidden by the chapter projection rules.

### `add_note`

Purpose: add temporary or persistent inline guidance to the chat timeline.

Expected args:

```ts
{
  content: string;
  expiresAfterMessages?: number | null;
}
```

Run behavior:

- If `content` is present, calls `ChatService.AddNote(content, expiresAfterMessages)`.
- If `content` is missing, opens the existing Add Note modal.

User-visible result:

- A note message appears in chat and participates in LLM context until it expires.

### `ask_user`

Purpose: ask the user for clarification before another workflow action is useful.

Expected args:

```ts
{
  question?: string;
  options?: string[];
}
```

Run behavior:

- Opens a clarification popup with the question, optional suggested answers, and a free-form answer field.
- Saving calls `ChatService.AddAgentClarification(question, answer)`.
- If the model returns intent `ask_user` but no actions, Agent Flow creates a fallback `ask_user` action using the rationale as the question.

User-visible result:

- An Agent Clarification message appears in the chat timeline.
- The clarification is represented as its own CQRS event type: `AgentClarificationCreated`.
- The clarification is deletable through the normal message deletion flow.

Current limitation:

- It only asks the question. It does not automatically resume the original intended workflow after the user answers.

## Intent Without Actions

Some model responses may include an intent but no executable action. Current behavior:

- `update_memory`: creates an **Open memories** action.
- `generate_image`: creates a **Generate image** action.
- `refresh_plan`: creates an **Open plans** action.
- `create_chapter`: creates a **Create chapter** action that opens the chapter editor.
- `add_note`: creates an **Add note** action that opens the note editor.
- `ask_user`: creates an **Ask** action.
- `continue_chat`: shows no action.

## Signal Badge

The badge no longer displays the raw percentage. It shows a label derived from model confidence and whether actions exist:

- `Suggested`: high-confidence suggestion with at least one action.
- `Review`: medium-confidence suggestion with at least one action.
- `Partial`: low-confidence suggestion with at least one action.
- `No action`: no executable action was proposed or generated.

The raw confidence percentage is still available as the badge tooltip.

## Current Design Constraints

- Agent Flow is user-triggered, not autonomous.
- Actions require an explicit user click.
- The model proposes actions; local services execute them.
- Missing args now open relevant local UI where possible.

## Likely Next Improvements

- Track the source intent/action in the chat timeline for auditability.
- For `ask_user`, store the pending follow-up so the original workflow can resume after the user answers.
