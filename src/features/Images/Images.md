# Images Feature

## Overview

The Images feature provides AI-powered image generation for chats using the CivitAI API. Users can configure image models with detailed generation parameters (prompts, samplers, LoRA networks, etc.), generate sample images, and trigger in-chat image generation. Each chat can have its own set of image models, or fall back to global defaults.

## Pages

### `ImageSettingsPage`

Manages the global default image models. These models serve as templates for new chats and as fallbacks when no chat-specific models are configured.

### `ChatImageModelsPage`

Manages image models for a specific chat. Users can:
- View and select the active model
- Add models from global templates
- Edit model parameters
- Navigate to model editing

### `ChatImageModelEditPage`

Edit a specific image model's parameters within a chat context.

### `ChatImageModelTemplatePage`

Select and import image models from the global defaults into a chat.

### `DefaultImageModelsPage`

Browse and manage the full list of default image models.

### `ImageModelEditPage`

Full editor for an image model's generation parameters.

## Components

### `ImageModelList` / `ImageModelListDefault`

Lists image models with select, edit, and delete actions.

### `ImageModelListItem`

Renders a single image model with its sample image, name, and action buttons.

### `SampleImageGenerator`

Triggers a CivitAI job to generate a preview image for a model configuration. Displays loading, success, and error states.

### `ModelFromImage`

Extracts image model parameters from a previously generated image, allowing users to reverse-engineer settings.

### `SchedulerCombobox`

A searchable combobox for selecting the diffusion scheduler/sampler used during image generation.

### `CivitaiKeyManager`

Manages the CivitAI API key (similar to `GrokKeyManager`), displayed in System Settings.

### `ImageModelViewComponents/`

Sub-components for the model editor:
- **PromptsComponent** — positive/negative prompt editors
- **ParametersComponent** — numeric parameters (steps, CFG scale, dimensions, etc.)
- **AdditionalNetworksComponent** — LoRA/additional network configuration

## Hooks

| Hook | Purpose |
|------|---------|
| `useImageModels` | Loads and manages global default image models |
| `useChatImageModels` | Loads and manages chat-specific image models with selection state |
| `useCivitJob` | Polls a CivitAI job for completion and retrieves the generated photo |
| `useCivitaiKey` | Manages CivitAI API key validation state |

## Services

### Core Services

- **ImageGenerator** — orchestrates the full image generation flow: resolves prompt → calls LLM for scene description → triggers CivitAI job
- **CivitJobOrchestrator** — manages job polling: checks status → downloads photo → stores locally
- **PhotoStorageService** — persists generated photos to blob storage for offline access
- **ChatImageModelService** / **ChatImageModelsManagedBlob** — per-chat image model persistence
- **ImageModelsManagedBlob** — global default image model persistence

### API Clients

- **CivitJobAPI** — triggers image generation jobs and checks job status via CivitAI
- **CivitKeyAPI** — manages CivitAI API key storage and validation

### Model Generation Services

- **ImageModel** — TypeScript interface defining model configuration (name, CivitAI input params, prompts)
- **ImageModelService** — CRUD operations for global image models
- **ImageModelMapper** / **BaseModelMapper** / **SchedulerMapper** — mapping utilities between app types and CivitAI API types
- **ImageModelFromGeneratedImageService** — extracts model config from a generated image's metadata
- **GeneratedImage** / **GeneratedImageQuery** — types and queries for generated image data
- **ImageIdExtractor** — extracts image IDs from CivitAI responses

## Directory Structure

```
Images/
  components/
    CivitaiKeyManager.tsx
    ImageModelList.tsx
    ImageModelListDefault.tsx
    ImageModelListItem.tsx
    ImageModelViewComponents/
      AdditionalNetworksComponent.tsx
      ParametersComponent.tsx
      PromptsComponent.tsx
    ModelFromImage.tsx
    ModelSampleImage.tsx
    SampleImageGenerator.tsx
    SchedulerCombobox.tsx
  hooks/
    useChatImageModels.ts
    useCivitJob.ts
    useCivitaiKey.ts
    useImageModels.ts
  pages/
    ChatImageModelEditPage.tsx
    ChatImageModelTemplatePage.tsx
    ChatImageModelsPage.tsx
    DefaultImageModelsPage.tsx
    ImageModelEditPage.tsx
    ImageSettingsPage.tsx
  services/
    ChatImageModelService.ts
    ChatImageModelsManagedBlob.ts
    CivitJob.ts
    CivitJobOrchestrator.ts
    ImageGenerator.ts
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
