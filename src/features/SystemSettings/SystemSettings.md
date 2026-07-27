# SystemSettings Feature

## Overview

The SystemSettings feature provides a centralized settings page for configuring application-wide preferences, including default LLM behavior, request monitoring, chapter buffering, and automatic message compression.

## Pages

### `SystemSettingsPage`

A settings dashboard organized into sections:
1. **Grok API Configuration** — displays the `GrokKeyManager` for managing the Grok API key
2. **Civitai API Configuration** — displays the `CivitaiKeyManager` for managing the CivitAI API key
3. **Chat Generation Settings** — displays the `SystemSettingsEditor` for configuring the default model and context-compression policies

Saves pending changes on navigation away.

## Components

### `SystemSettingsEditor`

Renders controls for the default model, monitoring retention, chapter trailing
messages, and automatic message compression. Message compression is opt-in and
configures both the number of newer ordinary messages required and the minimum
source length. Disabling it hides saved compression controls and restores
original message content in all LLM contexts without deleting the saved
compressions. Changes are debounce-saved to blob storage.

## Hooks

### `useSystemSettings`

Loads system settings from blob storage and provides them to components. Returns `{ systemSettings, isLoading }`.

## Services

### `SystemSettingsService`

CRUD operations for system settings:
- `Get()` — retrieves saved settings
- `Save()` / `SaveDebounced()` — persists settings
- `SavePendingChanges()` — flushes any debounced writes

### `SystemSettingsManagedBlob`

Handles encrypted blob storage persistence for system settings data.

### `SystemSettings`

TypeScript interfaces:

```typescript
interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  chapterCompressionSettings?: ChapterCompressionSettings;
  messageCompressionSettings?: MessageCompressionSettings;
}

interface ChatGenerationSettings {
  model?: string;  // Default Grok model ID
}

interface MessageCompressionSettings {
  enabled?: boolean;
  afterMessages?: number;
  minimumCharacters?: number;
}
```

## Integration Points

- **Grok Feature** — `GrokKeyManager` component is embedded for API key management
- **Images Feature** — `CivitaiKeyManager` component is embedded for API key management
- **Chat Generation** — `chatGenerationSettings.model` is read by `GrokChatAPI` and `TextGenerationService` as the default model
- **AI Components** — uses `ModelSelect` from the AI feature

## Directory Structure

```
SystemSettings/
  components/
    SystemSettingsEditor.tsx
    SystemSettingsEditor.test.tsx
    index.ts
  hooks/
    useSystemSettings.ts
  pages/
    SystemSettingsPage.tsx
  services/
    SystemSettings.ts
    SystemSettingsManagedBlob.ts
    SystemSettingsService.ts
```
