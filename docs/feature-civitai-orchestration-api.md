# Feature: Migrate to CivitAI Orchestration API

**Branch:** `feature/update-to-orchestration-api`

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [Current Architecture (Legacy)](#2-current-architecture-legacy)
3. [New Architecture: Orchestration API](#3-new-architecture-orchestration-api)
4. [CivitAI Orchestration API — Key Concepts](#4-civitai-orchestration-api--key-concepts)
5. [Input Schema: Old vs New](#5-input-schema-old-vs-new)
6. [Polling & Result Model](#6-polling--result-model)
7. [Proposed Frontend Changes](#7-proposed-frontend-changes)
8. [Proposed Backend Changes](#8-proposed-backend-changes)
9. [ImageModel Input Type Migration](#9-imagemodel-input-type-migration)
10. [Open Questions](#10-open-questions)

---

## 1. Background & Motivation

The app currently uses the legacy CivitAI Jobs API via the [`civitai` npm SDK](https://www.npmjs.com/package/civitai).
This SDK is a wrapper around the old `/v1/consumer/jobs` endpoint, which is effectively deprecated
in favour of CivitAI's new **Orchestration API** at `https://orchestration.civitai.com`.

The new API uses a **Workflow + Step** model that is more flexible, supports chaining steps
(e.g. generate → upscale), and exposes richer status / result shapes. It also supports webhooks,
workflow deduplication, caching, and a full CRUD lifecycle.

---

## 2. Current Architecture (Legacy)

### Flow Summary

```
Frontend (ImageGenerator.triggerJob)
  └─> CivitJobAPI.generateImage(FromTextInput)
        └─> POST /api/GenerateImage  [proxy in story-vault-api]
              └─> civitai.image.fromText(input)  [civitai SDK]
                    └─> CivitAI Jobs API (old)
                          └─> returns { token: jobId, jobs: [{ jobId }] }

Frontend (CivitJobOrchestrator.getOrPollPhoto) [polled by useCivitJob hook]
  └─> CivitJobAPI.getJobStatus(jobId)
        └─> POST /api/GetJobStatus  [proxy in story-vault-api]
              └─> civitai.jobs.getById(jobId)  [civitai SDK]
                    └─> returns { scheduled: bool, result: [{ available, blobUrl }] }
```

### Key Files (Frontend — story-vault-ui)

| File | Role |
|---|---|
| `src/features/Images/services/api/CivitJobAPI.ts` | HTTP client; calls backend proxy endpoints |
| `src/features/Images/services/CivitJobOrchestrator.ts` | Polls status; downloads/caches photo |
| `src/features/Images/services/CivitJob.ts` | Types: `CivitJobStatus`, `CivitJobResult`, `PhotoData` |
| `src/features/Images/services/ImageGenerator.ts` | Builds `FromTextInput` from `ImageModel`; calls `triggerJob` |
| `src/features/Images/services/modelGeneration/ImageModel.ts` | Core model; `input: FromTextInput` |
| `src/features/Images/hooks/useCivitJob.ts` | React hook; drives polling loop |
| `src/services/Dependencies.ts` | DI container — `CivitJobAPI()`, `CivitJobOrchestrator()` |

### Key Files (Backend — story-vault-api)

| File | Role |
|---|---|
| `src/functions/GenerateImage.ts` | Azure Function; authenticates user; calls `CivitaiClient.generateImage()` |
| `src/functions/GetJobStatus.ts` | Azure Function; authenticates user; calls `CivitaiClient.getJobStatus()` |
| `src/utils/civitaiClient.ts` | Uses `civitai` npm SDK (`civitai.image.fromText`, `civitai.jobs.getById`) |
| `src/databaseRequests/getCivitaiKeyRequest.ts` | Retrieves encrypted civitai key from blob storage by `userId + encryptionKey` |

### Auth / Encryption Pattern (Current)

The civitai API key is stored **encrypted** in Azure Blob Storage, keyed by the Auth0 `userId`.
The encryption key is **client-derived** — it lives only in the browser and is sent via a custom
`EncryptionKey` HTTP header on each call to the backend.

```
Frontend ──[Bearer JWT + EncryptionKey header]──> Backend
  Backend decrypts civitai key with EncryptionKey
  Backend uses decrypted key to call civitai SDK
```

### What `FromTextInput` Contains

```typescript
type FromTextInput = {
  model: string;           // AIR URN, e.g. "urn:air:sdxl:checkpoint:civitai:101055@128078"
  params: {
    prompt: string;
    negativePrompt?: string;
    scheduler?: Scheduler; // legacy enum
    steps?: number;
    cfgScale?: number;
    width: number;
    height: number;
    seed?: number;
    clipSkip?: number;     // SD1 only — SDXL/Flux WILL 400 if sent
  };
  additionalNetworks?: {
    [airUrn: string]: { strength: number };  // LoRAs keyed by AIR URN
  };
  batchSize?: number;
  quantity?: number;
};
```

This type is imported from `civitai/dist/types/Inputs` and is what the **existing `ImageModel.input`
field is typed as**.

---

## 3. New Architecture: Orchestration API

### Design Principle: Backend as Dumb Proxy

The backend's sole responsibility is to:
1. **Authenticate** the caller via the Auth0 JWT (extracts `userId`).
2. **Retrieve** the user's CivitAI API key from encrypted blob storage (same as today).
3. **Proxy** the request body unchanged to `https://orchestration.civitai.com`, injecting
   `Authorization: Bearer <civitaiKey>`.

The backend does **not** interpret or transform the workflow payload. It knows nothing about
step types, input schemas, or result shapes — that logic lives entirely in the frontend.

### New Flow

```
Frontend (ImageGenerator.triggerJob)
  └─> CivitOrchestrationAPI.submitWorkflow({ steps: [imageGenStep] })
        └─> POST /api/SubmitWorkflow  [new dumb proxy]
              └─> POST https://orchestration.civitai.com/v2/consumer/workflows
                    └─> returns { id: "wf_...", status, steps[] }

Frontend (CivitJobOrchestrator.getOrPollPhoto) [polled loop]
  └─> CivitOrchestrationAPI.getWorkflow(workflowId)
        └─> GET /api/GetWorkflow/:workflowId  [new dumb proxy]
              └─> GET https://orchestration.civitai.com/v2/consumer/workflows/:workflowId
                    └─> returns { id, status, steps[].output.images[] }
```

---

## 4. CivitAI Orchestration API — Key Concepts

Reference: https://developer.civitai.com/orchestration/guide/workflows

### Hierarchy

- **Workflow** — container submitted via `POST /v2/consumer/workflows`. Identified by `workflowId` (prefix `wf_`).
- **Step** — unit of work inside a workflow. Has `$type` (e.g. `imageGen`), `name`, and `input`.
- **Job** — internal unit run by a provider. Usually invisible to consumer code.

### Status Lifecycle (Workflows, Steps, Jobs share enum)

```
unassigned → preparing → scheduled → processing → succeeded
                                                └─> failed
                                                └─> expired
                                                └─> canceled
```

Terminal states: `succeeded`, `failed`, `expired`, `canceled`.

### SubmitWorkflow

```http
POST https://orchestration.civitai.com/v2/consumer/workflows?wait=60
Authorization: Bearer <civitai-token>
Content-Type: application/json

{
  "steps": [
    {
      "$type": "imageGen",
      "input": { ... }
    }
  ]
}
```

Query params:
- `wait=N` — block up to N seconds (max 100s) for workflow to reach terminal state.
  Returns `200` if done, `202` if still in flight.
- `whatif=true` — validate + estimate cost without executing.

### GetWorkflow

```http
GET https://orchestration.civitai.com/v2/consumer/workflows/{workflowId}
Authorization: Bearer <civitai-token>
```

### Result Shape

```json
{
  "id": "wf_01HXYZ...",
  "status": "succeeded",
  "steps": [
    {
      "name": "0",
      "$type": "imageGen",
      "status": "succeeded",
      "output": {
        "images": [
          { "id": "blob_...", "url": "https://.../signed-url" }
        ]
      }
    }
  ]
}
```

⚠️ **Blob URLs are signed and expire** — do not cache the URL long-term. Download the image bytes
immediately and store base64 locally (same pattern as today's `PhotoStorageService`).

### imageGen Step Input — SDXL (sdcpp engine, default)

```json
{
  "$type": "imageGen",
  "input": {
    "engine": "sdcpp",
    "ecosystem": "sdxl",
    "operation": "createImage",
    "model": "urn:air:sdxl:checkpoint:civitai:101055@128078",
    "prompt": "masterpiece, best quality, ...",
    "negativePrompt": "worst quality, low quality, blurry",
    "width": 1024,
    "height": 1024,
    "cfgScale": 7,
    "steps": 25,
    "loras": {
      "urn:air:sdxl:lora:civitai:123456@789012": 0.8
    }
  }
}
```

#### ⚠️ Critical differences from `FromTextInput`

| Old (`FromTextInput`) | New (orchestration `imageGen`) | Notes |
|---|---|---|
| `params.prompt` | `prompt` (top-level) | Flattened |
| `params.negativePrompt` | `negativePrompt` (top-level) | Flattened |
| `params.scheduler` | `sampleMethod` (sdcpp) or `sampler` (comfy) | Enum values differ |
| `params.steps` | `steps` (top-level) | Flattened |
| `params.cfgScale` | `cfgScale` (top-level) | Flattened |
| `params.width/height` | `width`/`height` (top-level) | Flattened |
| `params.clipSkip` | **Only valid for SD1**; SDXL will `400` | Must be stripped for SDXL/Flux |
| `additionalNetworks: { [air]: { strength } }` | `loras: { [air]: strength }` | LoRA strength is now a bare number, not `{ strength }` |
| `model` | `model` | Same AIR URN format ✅ |

#### SDXL vs SD1 key differences

| | SDXL (`ecosystem: "sdxl"`) | SD1 (`ecosystem: "sd1"`) |
|---|---|---|
| Native res | 1024×1024 | 512×512 |
| `clipSkip` | ❌ Not supported — will 400 | ✅ Valid |
| `loras` | ✅ | ✅ |

#### Engine: sdcpp vs comfy

Use `engine: "sdcpp"` (default). Use `engine: "comfy"` only when you need ComfyUI-specific
samplers (`dpmpp_2m`, etc.) or the `karras` scheduler.

- sdcpp sampler field: `sampleMethod`
- comfy sampler field: `sampler`

The existing `SchedulerMapper` maps old SD1 scheduler names — **this will need updating or
bypassing for the new API**.

---

## 5. Input Schema: Old vs New

The `ImageModel.input` is currently typed as `FromTextInput` (from the `civitai` npm SDK).
This type is used in:

- `ImageGenerator.triggerJob()` — reads `selectedModel.input`, appends prompts, calls `generateImage`
- `ImageModelMapper.mapToFromTextInput()` — builds the input from a `GeneratedImage`
- Stored as part of `ImageModel` in blob storage

**The `ImageModel.input` field must be replaced with a new type that matches the orchestration API
`imageGen` step input.**

### Proposed New Type (working name: `ImageGenInput`)

```typescript
// Replaces `FromTextInput` as the stored input type in `ImageModel`
type ImageGenInput = {
  engine: "sdcpp" | "comfy";
  ecosystem: "sdxl" | "sd1";
  operation: "createImage";
  model: string;              // AIR URN
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps?: number;
  cfgScale?: number;
  sampleMethod?: string;      // sdcpp only
  sampler?: string;           // comfy only
  scheduler?: string;         // comfy only
  schedule?: string;          // sdcpp only
  clipSkip?: number;          // sd1 only — must NOT be sent for sdxl/flux
  seed?: number;
  loras?: Record<string, number>;  // { [airUrn]: strength }
  quantity?: number;
};
```

**Note on `sampleImageId`:** `ImageModel.sampleImageId` currently holds a legacy `jobId`.
After this migration it should hold a `workflowId` (prefixed `wf_`). The type should be renamed
or documented as `sampleWorkflowId`.

---

## 6. Polling & Result Model

### New `WorkflowStatus` Types (replaces `CivitJobStatus`)

```typescript
type WorkflowStatus = "unassigned" | "preparing" | "scheduled" | "processing"
  | "succeeded" | "failed" | "expired" | "canceled";

type WorkflowImage = {
  id: string;     // blob_...
  url: string;    // signed, expires
};

type WorkflowStep = {
  name: string;
  $type: string;
  status: WorkflowStatus;
  output?: {
    images?: WorkflowImage[];
  };
};

type Workflow = {
  id: string;               // wf_...
  status: WorkflowStatus;
  steps: WorkflowStep[];
};
```

### Polling Logic Changes

| | Old | New |
|---|---|---|
| "Is loading?" | `status.scheduled === true` | `status` is `unassigned` / `preparing` / `scheduled` / `processing` |
| "Is done?" | `result[0].available === true` | `status === "succeeded"` |
| "Is errored?" | `result` empty / unavailable | `status` is `failed` / `expired` / `canceled` |
| "Get image URL" | `result[0].blobUrl` | `steps[0].output.images[0].url` |

---

## 7. Proposed Frontend Changes

### New/Modified Files

| File | Change |
|---|---|
| `src/features/Images/services/api/CivitOrchestrationAPI.ts` | **NEW** — replaces `CivitJobAPI`. Two methods: `submitWorkflow(steps)` and `getWorkflow(workflowId)`. Calls new backend proxy endpoints. No more `EncryptionKey` header. |
| `src/features/Images/services/CivitJob.ts` | **UPDATE** — replace `CivitJobStatus`/`PhotoData` with new orchestration types (`Workflow`, `WorkflowStatus`, etc.). |
| `src/features/Images/services/CivitJobOrchestrator.ts` | **UPDATE** — use `WorkflowStatus` to determine loading/done/error. Extract image URL from `steps[0].output.images[0].url`. |
| `src/features/Images/services/ImageGenerator.ts` | **UPDATE** — `triggerJob()` builds an orchestration `imageGen` step from `ImageModel.input` (new type), calls new API. Returns `workflowId`. |
| `src/features/Images/services/modelGeneration/ImageModel.ts` | **UPDATE** — change `input: FromTextInput` → `input: ImageGenInput`. Rename/document `sampleImageId` → `sampleWorkflowId`. |
| `src/features/Images/services/modelGeneration/ImageModelMapper.ts` | **UPDATE** — `mapToFromTextInput()` → `mapToImageGenInput()`. Flatten params, remap LoRA structure, strip `clipSkip` for SDXL, map scheduler names. |
| `src/services/Dependencies.ts` | **UPDATE** — swap `CivitJobAPI()` → `CivitOrchestrationAPI()`. |
| `src/features/Images/api/CivitJobAPI.ts` | **REMOVE** (or keep temporarily for backward compat) |

### No Change Expected

- `PhotoStorageService` — still downloads and caches the image from a URL
- `useCivitJob` hook — polls `CivitJobOrchestrator`, shape of `CivitJobResult` unchanged
- `ImageGenerationService` — calls `ImageGenerator.triggerJob`, saves `jobId` (now `workflowId`) as event
- CQRS events (`CivitJobCreatedEventUtil`, `ChatEvent`) — may only need field rename (`jobId` → `workflowId`)

---

## 8. Proposed Backend Changes

### Design: Thin Proxy Functions

Each new Azure Function:
1. Authenticates the caller (existing `getAuthenticatedUserId` pattern).
2. Retrieves the user's civitai key from encrypted storage.
3. Forwards the request to the CivitAI Orchestration API with the civitai key as Bearer token.
4. Returns the orchestration API response directly (no transformation).

### New Endpoints

#### `POST /api/SubmitWorkflow`

```
Frontend body: { steps: [...] }  (full orchestration workflow body)
Backend: fetches civitaiKey, then:
  POST https://orchestration.civitai.com/v2/consumer/workflows?wait=60
  Authorization: Bearer <civitaiKey>
  Body: <forwarded verbatim>
Returns: Workflow object from orchestration API
```

#### `GET /api/GetWorkflow/:workflowId`

```
Backend: fetches civitaiKey, then:
  GET https://orchestration.civitai.com/v2/consumer/workflows/{workflowId}
  Authorization: Bearer <civitaiKey>
Returns: Workflow object from orchestration API
```

### Files to Add/Remove (Backend)

| File | Change |
|---|---|
| `src/functions/SubmitWorkflow.ts` | **NEW** |
| `src/functions/GetWorkflow.ts` | **NEW** |
| `src/functions/GenerateImage.ts` | **DEPRECATE / REMOVE** |
| `src/functions/GetJobStatus.ts` | **DEPRECATE / REMOVE** |
| `src/utils/civitaiClient.ts` | **SIMPLIFY** — remove `generateImage`/`getJobStatus` methods; keep `hasValidKey` |

### Auth: Does the `EncryptionKey` Header Still Exist?

Currently, the frontend sends a custom `EncryptionKey` header so the backend can decrypt the
stored civitai key. Under the new dumb proxy design:

- **Option A (Minimal change):** Keep the `EncryptionKey` header. The backend still decrypts the
  civitai key using it, then forwards to the orchestration API. No change to key storage model.
- **Option B (Cleaner):** Move to backend-side key encryption (e.g. encrypted with a server-managed
  secret), removing the need for the frontend to send an encryption key. Bigger scope change.

**→ See Open Question #1.**

---

## 9. ImageModel Input Type Migration

The existing `ImageModel.input` values are stored in blob storage. A type migration must be handled:

### Existing `ImageModel.input` (legacy `FromTextInput`)

```json
{
  "model": "urn:air:sdxl:checkpoint:civitai:101055@128078",
  "params": {
    "prompt": "masterpiece, best quality, ...",
    "negativePrompt": "worst quality, low quality",
    "scheduler": "EulerA",
    "steps": 25,
    "cfgScale": 7,
    "width": 1024,
    "height": 1024,
    "clipSkip": 2
  },
  "additionalNetworks": {
    "urn:air:sdxl:lora:civitai:123456@789012": { "strength": 0.8 }
  }
}
```

### Target `ImageGenInput` (orchestration API)

```json
{
  "engine": "sdcpp",
  "ecosystem": "sdxl",
  "operation": "createImage",
  "model": "urn:air:sdxl:checkpoint:civitai:101055@128078",
  "prompt": "masterpiece, best quality, ...",
  "negativePrompt": "worst quality, low quality",
  "sampleMethod": "euler_a",
  "steps": 25,
  "cfgScale": 7,
  "width": 1024,
  "height": 1024,
  "loras": {
    "urn:air:sdxl:lora:civitai:123456@789012": 0.8
  }
}
```

### Migration Notes

1. **`params.*` → flattened** — `params.prompt` → `prompt`, `params.steps` → `steps`, etc.
2. **`additionalNetworks[air].strength` → `loras[air]`** — strength is now a bare number.
3. **`clipSkip` must be dropped for SDXL** — SDXL will return `400` if `clipSkip` is sent. Need
   to detect base model type from the AIR URN (`urn:air:sdxl:*` vs `urn:air:sd1:*`) and conditionally
   omit.
4. **Scheduler name mapping** — the old `Scheduler` enum (from civitai SDK) maps to `sampleMethod`
   (sdcpp) or `sampler` (comfy). The existing `SchedulerMapper` needs to be updated or replaced.
5. **`engine` and `ecosystem` defaults** — derive from AIR URN base model:
   - `urn:air:sdxl:*` → `engine: "sdcpp"`, `ecosystem: "sdxl"`
   - `urn:air:sd1:*` → `engine: "sdcpp"`, `ecosystem: "sd1"`
6. **Stored models need migration** — existing `ImageModel` objects in blob storage still carry
   `FromTextInput`. Either:
   - Migrate on read (runtime adapter/shim that detects old vs new format)
   - Lazy migration at save time
   - One-time migration script

---

## 10. Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | EncryptionKey header | **Keep as-is.** Frontend continues sending `EncryptionKey` header. Backend decrypts civitai key with it before proxying. |
| Q2 | Scheduler mapping | **Map old names to new enum values.** Update `SchedulerMapper` to output orchestration API `sampleMethod` values. |
| Q3 | Stored `ImageModel` migration | **Read-time shim.** Detect old `FromTextInput` format on load and transparently upgrade to `ImageGenInput` in memory. No script needed. |
| Q4 | `sampleImageId` rename | **Yes — rename to `sampleWorkflowId`.** Handle alongside the Q3 migration shim (old values may be legacy job IDs; new values will be `wf_` prefixed). |
| Q5 | Remove `civitai` npm SDK | **Yes — remove from both repos** once `FromTextInput` is replaced. |
| Q6 | Submit strategy | **Use `wait=60`.** Most SDXL jobs finish in one round-trip. Polling loop remains as fallback for slow/queued jobs. |
