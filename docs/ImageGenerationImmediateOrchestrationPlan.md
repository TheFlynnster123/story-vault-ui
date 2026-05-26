# Immediate Image Generation Orchestration Plan

## Goals

- Clicking generate photo should add a visible chat message immediately.
- The message should progress through persisted stages:
  - `Determining character...`
  - `Generating scene prompt for {name}...`
  - `Submitting image for generation...`
  - normal Civitai image polling once a workflow id exists.
- The user should be able to queue multiple image generations.
- Refreshes or reconnects should resume unfinished image generations from the last persisted stage.
- Resume logic must avoid double-running the same generation in one tab and should reduce duplicate work across tabs.
- Existing completed image messages and old saved images must keep working.

## Current Problem

`ImageGenerationService.generateImage()` currently waits for:

1. character selection,
2. scene prompt generation,
3. Civitai workflow submission,
4. chat event creation.

That means the UI does not show the image message until the slow orchestration work is already done. If the page refreshes before `CreateCivitJob`, there is no durable record to resume.

## Proposed Data Model

Keep the existing `civit-job` chat message type, but allow it to represent both pending and submitted image generations.

Add a new event:

```ts
type CivitJobUpdatedEvent = {
  type: "CivitJobUpdated";
  messageId: string;
  patch: Partial<CivitJobData>;
};
```

Use the existing `CivitJobCreated` event for the immediate placeholder message. Its `jobId` will initially be a local generation id. When Civitai returns a workflow id, a `CivitJobUpdated` event patches `data.jobId` to the workflow id.

Add persisted message fields:

```ts
generationStatus?:
  | "determining-character"
  | "missing-character-description"
  | "generating-prompt"
  | "submitting"
  | "submitted"
  | "failed";
generationError?: string;
```

Existing fields (`characterName`, `characterDescription`, `sceneDescription`, `basePrompt`, `modelName`, `modelId`, `modelSource`) remain the resume payload.

## Runtime Flow

### New Generation

1. Generate a local id: `image-gen-{uuid}`.
2. Immediately call `CreateCivitJob(localId, "", { generationStatus: "determining-character" })`.
3. Start background orchestration for that local id without awaiting it in the click handler.
4. Resolve character context.
5. If a description is missing, patch status to `missing-character-description` and return the same modal decision flow as today.
6. Once a usable character context exists, patch status to `generating-prompt` plus `characterName` / `characterDescription`.
7. Generate the scene prompt.
8. Patch `sceneDescription`.
9. Patch status to `submitting`.
10. Submit to Civitai.
11. Patch status to `submitted`, replacing `data.jobId` with the workflow id and storing prompt/model metadata.

### Resume

On chat initialization:

1. Read visible/user projection messages.
2. Find `civit-job` messages whose `generationStatus` is one of:
   - `determining-character`
   - `generating-prompt`
   - `submitting`
   - `missing-character-description`
3. For each resumable message, call `resumeGeneration(message.id)`.
4. Resume from persisted data:
   - `determining-character`: resolve character context.
   - `generating-prompt` without `sceneDescription`: generate scene prompt.
   - `submitting`, or `generating-prompt` with `sceneDescription`: submit to Civitai.
   - `missing-character-description`: wait for user decision; do not auto-continue.

## Duplicate Work Guard

- Keep an in-memory `activeGenerationIds` set in `ImageGenerationService`.
- Add a short localStorage lease per generation id:
  - key: `story-vault:image-generation-lease:{chatId}:{messageId}`
  - TTL: 2 minutes
- A runner must acquire the lease before doing work and release it when finished.
- Stage updates refresh the lease.
- This prevents normal double-click/resume double-runs in one tab and reduces duplicate work across multiple open tabs. If a tab crashes, TTL expiry allows another tab or refresh to resume.

## UI

`CivitJobMessage` should render pending stage text before a workflow id exists.

Examples:

- **Determining** character...
- **Generating** scene prompt for **Sarah Chen**...
- **Generating** image...

Use small highlighted spans for key words and character/model names. Once `generationStatus === "submitted"` and `data.jobId` is a workflow id, existing `useCivitJob` polling renders the normal loading/image/error state.

## Implementation Steps

1. Add `CivitJobUpdatedEvent`, event util, `ChatService.UpdateCivitJob`, and projection handling.
2. Extend `CivitJobCreatedEvent` extras and `CivitJobChatMessage.data` with generation status/error fields.
3. Refactor `ImageGenerationService.generateImage()` to create a pending message immediately and run orchestration in the background.
4. Add `resumePendingGenerations()` and `resumeGeneration(messageId)`.
5. Call resume after chat event initialization in `useEnsureChatInitialization`.
6. Update missing-description resolution to continue the existing pending message when possible.
7. Update `CivitJobMessage` to display status previews with highlighted words.
8. Add focused tests for immediate message creation, projection patching, resume, and submitted polling behavior.
