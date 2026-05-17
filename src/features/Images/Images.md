# Images Feature

## Overview

The Images feature provides AI-powered image generation for chats using the CivitAI API. Users configure **System Image Models** — global, reusable model templates — and then create per-chat **Image Model Variants** that inherit from those templates and selectively override individual fields. During generation, `ImageGenerator` resolves which model to use, calls an LLM to produce a scene description, then submits a CivitAI job and polls for the result.

---

## Flow 1: System Image Models

System Image Models are global templates available to all chats. They define the full set of CivitAI generation parameters (checkpoint, prompts, sampler, dimensions, LoRAs, etc.). Variants are always rooted in a system model.

### Data Model

```ts
// services/modelGeneration/ImageModel.ts
type ImageModel = {
  id: string;
  name: string;
  timestampUtcMs: number;
  input: FromTextInput;            // CivitAI generation parameters
  sampleImageId?: string;          // job ID of the preview image
  imageGenerationPrompt?: string;  // LLM prompt override for scene description
  appendImageGenerationPromptToBase?: boolean; // append instead of replace
  trainedWords?: string[];         // toggleable LoRA trigger words
};
```

`input` is CivitAI's `FromTextInput`, which contains:
- `model` — checkpoint AIR URN (e.g. `urn:air:sdxl:checkpoint:civitai:…`)
- `params` — `{ prompt, negativePrompt, scheduler, steps, cfgScale, width, height, clipSkip }`
- `additionalNetworks` — LoRA/embedding weights keyed by AIR URN

### Persistence

`ImageModelsManagedBlob` (`services/ImageModelsManagedBlob.ts`) wraps a **global** managed blob under the key `"UserImageModels"`. It stores `UserImageModels`:

```ts
type UserImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};
```

### Service: `ImageModelService`

`services/modelGeneration/ImageModelService.ts` is the single CRUD authority for system models:

| Method | Behaviour |
|---|---|
| `GetAllImageModels()` | Loads from blob; returns empty defaults if not found |
| `SaveImageModel(model)` | Upserts; maps scheduler display name → CivitAI name before saving |
| `DeleteImageModel(modelId)` | Removes model; clears `selectedModelId` if it was deleted |
| `SelectImageModel(modelId)` | Updates `selectedModelId` |
| `getOrDefaultSelectedModel()` | Returns selected → first → hardcoded SDXL default |

The scheduler mapping step in `SaveImageModel` translates human-readable names (e.g. `"DPM++ 2M Karras"`) to the CivitAI API enum value (e.g. `"DPM2MKarras"`) via `SchedulerMapper`.

### Hook: `useImageModels`

`hooks/useImageModels.ts` wraps `ImageModelService` for React components:
- Loads all models on mount
- Exposes: `userImageModels`, `loading`, `error`, `saveImageModel`, `deleteImageModel`, `selectImageModel`, `getSelectedModel`, `refreshModels`
- Optimistically updates local state on save/delete/select

### Pages

| Page | Route | Purpose |
|---|---|---|
| `ImageSettingsPage` | `/image-settings` | Entry point for system model management |
| `DefaultImageModelsPage` | `/image-models` | Browse/manage the full list of system models |
| `ImageModelEditPage` | `/image-models/edit/:modelId` | Edit all parameters of a single system model |

### Mapping Utilities

**`SchedulerMapper`** (`modelGeneration/SchedulerMapper.ts`): bidirectional mapping between display names and CivitAI API scheduler names. `MapToSchedulerName` is called on save; `MapToDisplayName` is called when loading for the UI.

**`BaseModelMapper`** (`modelGeneration/BaseModelMapper.ts`): maps CivitAI base model strings (e.g. `"illustrious"`, `"sd 1.5"`) to AIR URNs for use as the `model` field.

**`ImageModelMapper`** (`modelGeneration/ImageModelMapper.ts`): creates an `ImageModel` from a `GeneratedImage` (a CivitAI API response). Used by `ModelFromImage` to reverse-engineer a model from an existing generated image.

---

## Flow 2: Image Model Variants

Variants are per-chat, lightweight overrides of a system model. Instead of duplicating a full model, a variant stores only the fields that differ from its parent. At generation time the variant is resolved into a full `ImageModel` by merging parent + overrides.

### Data Model

```ts
// services/ImageModelVariant.ts

type ImageModelVariantOverrides = {
  input?: {
    model?: string;
    params?: Partial<FromTextInput["params"]>;
    additionalNetworks?: FromTextInput["additionalNetworks"];
  };
  sampleImageId?: string;
  imageGenerationPrompt?: string;
  appendImageGenerationPromptToBase?: boolean;
  trainedWords?: string[];
};

type ImageModelVariant = {
  id: string;
  name: string;
  parentModelId: string;   // references a system ImageModel.id
  timestampUtcMs: number;
  overrides: ImageModelVariantOverrides;
};
```

A field is only present in `overrides` when it differs from the parent. This means an empty `overrides: {}` variant is a pure alias of its parent.

### Key Utilities

**`resolveVariant(variant, parent)`** — merges `parent` and `variant.overrides` to produce a full `ImageModel`. This is the resolved form used for generation and display:
- Top-level fields (`sampleImageId`, `imageGenerationPrompt`, etc.) are taken from overrides only if the key is present on the overrides object.
- `input.params` uses spread: `{ ...parent.input.params, ...overrides.input?.params }`.
- `input.model` and `input.additionalNetworks` are only overridden if explicitly set.

**`computeOverriddenFields(overrides)`** — returns `OverriddenFields`, a map of booleans indicating which fields the variant currently overrides. Used by the edit page to highlight overridden sections and show override counts.

### Persistence

`ChatImageVariantsManagedBlob` (`services/ChatImageVariantsManagedBlob.ts`) wraps a **per-chat** managed blob under the key `"chat-image-variants"`. It stores `ChatImageVariants`:

```ts
type ChatImageVariants = {
  selectedVariantId: string;
  variants: ImageModelVariant[];
};
```

### Service: `ChatImageVariantService`

`services/ChatImageVariantService.ts` is the CRUD authority for a single chat's variants:

| Method | Behaviour |
|---|---|
| `GetAll()` | Loads from blob; returns `{ selectedVariantId: "", variants: [] }` if empty |
| `SaveVariant(variant)` | Upserts by `variant.id` |
| `DeleteVariant(variantId)` | Removes variant; clears `selectedVariantId` if it was deleted |
| `SelectVariant(variantId)` | Updates `selectedVariantId` |
| `CreateVariant(parentModelId, name)` | Creates a new variant with `overrides: {}` and persists it |
| `getSelectedModelOrDefault()` | Resolves selected variant (via `resolveVariant`) → falls back to `ImageModelService.getOrDefaultSelectedModel()` |
| `findParentModel(parentModelId)` | Looks up the parent in `ImageModelService.GetAllImageModels()` |
| `subscribe(callback)` | Subscribes to underlying blob changes |

### Hook: `useChatImageVariants`

`hooks/useChatImageVariants.ts` wraps `ChatImageVariantService` for React components:
- Loads all variants on mount; subscribes to blob changes for live updates
- Exposes: `chatImageVariants`, `loading`, `error`, `saveVariant`, `deleteVariant`, `selectVariant`, `createVariant`, `findParentModel`, `getSelectedVariant`, `refreshVariants`
- Optimistically updates local state on all mutations

### Pages

| Page | Route | Purpose |
|---|---|---|
| `ChatImageVariantsPage` | `/chat/:chatId/image-variants` | List all variants for a chat; select active; create new via parent picker |
| `ChatImageVariantEditPage` | `/chat/:chatId/image-variants/edit/:variantId` | Edit a variant's overrides with per-section override highlighting and reset |

#### `ChatImageVariantEditPage` behaviour

The edit page works entirely on the **resolved** model (parent + overrides merged). When a field is changed:
1. The resolved `ImageModel` is diffed against the parent via `computeNewOverrides`.
2. Only differing fields are stored as overrides.
3. The variant is saved via `ChatImageVariantService.SaveVariant`.

Each editor section (Prompts, Parameters, Image Generation Prompt) shows an override count badge and a "Reset" button that restores those fields to parent values.

---

## Generation Flow (Shared)

Both system models and variants feed into the same generation pipeline.

### Step 1 — Generate a scene description (`ImageGenerator.generatePrompt`)

`ImageGenerator` uses the **LLM** to produce a natural-language scene description from the chat's message history.

**Prompt resolution hierarchy** (`resolveImageGenerationPrompt`):
1. Selected model's `imageGenerationPrompt` + `appendImageGenerationPromptToBase: true` → `systemDefault + "\n\n" + modelPrompt`
2. Selected model's `imageGenerationPrompt` (without append) → replaces system default entirely
3. No model-level prompt → use `SystemPromptsService.defaultImagePrompt` (or `DEFAULT_SYSTEM_PROMPTS.defaultImagePrompt`)

The selected model is always resolved via `ChatImageVariantService.getSelectedModelOrDefault()`.

**Character context** is optionally injected: if the chat has a selected character with a description, a formatted block is appended before the image prompt instructing the LLM to focus on setting and action while omitting appearance (which is already in the CivitAI prompt).

### Step 2 — Trigger a CivitAI job (`ImageGenerator.triggerJob`)

```
triggerJob(sceneDescription, preferredImage?, characterDescription?)
```

**Model resolution** (`resolveModelForJob`):
- `preferredImage.source === "variant"` → look up variant in `ChatImageVariantService`, call `resolveVariant(variant, parent)`
- `preferredImage.source === "system"` → look up model in `ImageModelService.GetAllImageModels()`
- No `preferredImage` → `ChatImageVariantService.getSelectedModelOrDefault()`

The resolved model's `input.params.prompt` is mutated to append `characterDescription` (if any) and then `sceneDescription`, comma-separated.

The populated `FromTextInput` is sent to `CivitJobAPI.generateImage(input)`, which POSTs to `/api/GenerateImage` with the user's CivitAI encryption key in the `EncryptionKey` header.

Returns: `{ jobId, modelName, fullPrompt, basePrompt, sceneDescription }`.

### Step 3 — Poll for the result (`CivitJobOrchestrator.getOrPollPhoto`)

```
getOrPollPhoto(chatId, jobId) → CivitJobResult
```

| Condition | Result |
|---|---|
| Job still scheduled | `{ isLoading: true }` |
| Photo already in local blob storage | `{ photoBase64, isLoading: false }` |
| CivitAI reports `available: true` | Download → save via `PhotoStorageService` → `{ photoBase64, isLoading: false }` |
| Any error | `{ isLoading: false, error }` |

`PhotoStorageService` encrypts the base64 payload under the `"civitai"` encryption key before persisting, and decrypts on retrieval.

---

## Components

| Component | Purpose |
|---|---|
| `SampleImageGenerator` | Triggers a CivitAI job for a preview image; shows loading/success/error states |
| `ModelSampleImage` / `ModelPreviewImage` | Displays a stored sample image from a job ID |
| `ImageModelList` / `ImageModelListDefault` | Lists models with select, edit, delete actions |
| `ImageModelListItem` | Single model row with sample image thumbnail and action buttons |
| `ImageGenerationPromptSection` | Edits `imageGenerationPrompt` + `appendImageGenerationPromptToBase` toggle |
| `ModelFromImage` | Reverse-engineers a model config from a CivitAI-generated image via `ImageModelMapper` |
| `SchedulerCombobox` | Searchable combobox backed by `SchedulerMapper.GetAvailableSchedulers()` |
| `AddImageModelModal` | Modal for adding a new system model |
| `CharacterImageModelModal` | Modal for selecting a model in character context |
| `CivitaiKeyManager` | Manages the CivitAI API key; shown in System Settings |
| `ImageModelViewComponents/PromptsComponent` | Positive/negative prompt editor + trained word toggles |
| `ImageModelViewComponents/ParametersComponent` | Numeric parameters (steps, CFG scale, dimensions, clip skip, scheduler) |
| `ImageModelViewComponents/AdditionalModelsComponent` | LoRA / additional network configuration |

---

## Hooks

| Hook | Purpose |
|---|---|
| `useImageModels` | Global system model CRUD + selection state |
| `useChatImageVariants` | Per-chat variant CRUD + selection state; subscribes to blob changes |
| `useChatImageModels` | _(Legacy)_ Per-chat model CRUD; superseded by variants |
| `useCivitJob` | Polls `CivitJobOrchestrator` until a job resolves |
| `useCivitaiKey` | CivitAI API key validation state |
| `useModelPreview` | Fetches preview image for a given model / variant |

---

## API Clients

| Client | Endpoints |
|---|---|
| `CivitJobAPI` | `POST /api/GenerateImage` — triggers a generation job; `POST /api/GetJobStatus` — polls job status; `POST /api/SavePhoto` / `POST /api/GetPhoto` — encrypted photo persistence |
| `CivitKeyAPI` | Manages CivitAI API key storage and validation |

---

## Directory Structure

```
Images/
  components/
    AddImageModelModal.tsx
    CharacterImageModelModal.tsx
    CivitaiKeyManager.tsx
    ImageGenerationPromptSection.tsx
    ImageModelList.tsx
    ImageModelListDefault.tsx
    ImageModelListItem.tsx
    ImageModelViewComponents/
      AdditionalModelsComponent.tsx
      ParametersComponent.tsx
      PromptsComponent.tsx
    ModelFromImage.tsx
    ModelPreviewImage.tsx
    ModelSampleImage.tsx
    SampleImageGenerator.tsx
    SchedulerCombobox.tsx
  hooks/
    useChatImageModels.ts       # legacy
    useChatImageVariants.ts
    useCivitJob.ts
    useCivitaiKey.ts
    useImageModels.ts
    useModelPreview.ts
  pages/
    ChatImageModelEditPage.tsx   # legacy
    ChatImageModelTemplatePage.tsx  # legacy
    ChatImageModelsPage.tsx      # legacy
    ChatImageVariantEditPage.tsx
    ChatImageVariantsPage.tsx
    DefaultImageModelsPage.tsx
    ImageModelEditPage.tsx
    ImageSettingsPage.tsx
  services/
    ChatImageModelService.ts     # legacy
    ChatImageModelsManagedBlob.ts  # legacy
    ChatImageVariantService.ts
    ChatImageVariantsManagedBlob.ts
    CivitJob.ts
    CivitJobOrchestrator.ts
    ImageGenerator.ts
    ImageModelVariant.ts
    ImageModelsManagedBlob.ts
    PhotoStorageService.ts
    api/
      CivitJobAPI.ts
      CivitKeyAPI.ts
    modelGeneration/
      BaseModelMapper.ts
      GeneratedImage.ts
      GeneratedImageQuery.ts
      ImageIdExtractor.ts
      ImageModel.ts
      ImageModelFromGeneratedImageService.ts
      ImageModelMapper.ts
      ImageModelService.ts
      SchedulerMapper.ts
```
