# OpenRouter Feature

## Overview

The OpenRouter feature manages the OpenRouter API key lifecycle — validation, storage, and updates. OpenRouter is the LLM routing service used for all AI text generation in Story Vault, providing access to models from xAI (Grok), OpenAI, Anthropic, and more. A valid OpenRouter key is required before users can access the main application.

## Components

### `OpenRouterKeyInput`

A simple form displayed during onboarding (on the landing page) when no OpenRouter key exists. Encrypts the key client-side via `EncryptionManager` before sending it to the backend for storage.

### `OpenRouterKeyManager`

A full-featured key management component used in the System Settings page. Displays the current key status (valid/invalid) and provides an update form with:
- Validation (non-empty check)
- Encrypted storage via `EncryptionManager`
- Toast notifications for success/error feedback
- Loading states during save operations

## Hooks

### `useOpenRouterKey`

A singleton-backed hook that manages the OpenRouter key validation state across the entire app. Features:

- **Shared state** — uses a module-level singleton so all component instances see the same status
- **Lazy initialization** — only fetches key status once on first mount
- **Listener pattern** — all hook instances are notified when key status changes
- **Encryption init** — triggers `EncryptionManager.ensureKeysInitialized()` when a valid key is confirmed

Returns `{ hasValidOpenRouterKey, refreshOpenRouterKeyStatus }`.

## Services

### `OpenRouterChatAPI`

The HTTP client for sending chat messages to LLMs via OpenRouter through the Story Vault backend. It:
- Sends the encrypted OpenRouter key as a header for backend decryption
- Includes system settings (model override, generation settings)
- Returns the LLM's text reply

### `OpenRouterKeyAPI`

The HTTP client for OpenRouter key management:
- `hasValidOpenRouterKey()` — checks if a valid key exists (200 = valid, 404 = not found)
- `saveOpenRouterKey(encryptedKey)` — persists a new encrypted OpenRouter key

## Backend Proxy Pattern

Story Vault does not call most authenticated OpenRouter endpoints directly from the browser. The frontend talks to the Story Vault backend, and the backend forwards the request to OpenRouter after resolving the user's stored key.

### Current Contract

1. The browser authenticates to Story Vault with the app access token.
2. The browser sends the client-held `EncryptionKey` header when the backend needs to decrypt the stored OpenRouter key for a request.
3. The backend loads the user's encrypted OpenRouter key from storage.
4. The backend decrypts that stored key, builds the upstream OpenRouter request, and forwards it.
5. The backend returns the upstream status/body, or a narrow Story Vault wrapper when the route needs app-specific shaping.

### What Counts As A Simple Proxy

For simple passthrough routes, the backend route should stay thin:

- Authenticate the Story Vault user.
- Load that user's encrypted OpenRouter key.
- Decrypt it using the supplied `EncryptionKey`.
- Forward the request to the matching OpenRouter `/api/v1/...` route.
- Preserve the upstream response as closely as possible.

Example mapping used by the credits viewer:

- Story Vault route: `/api/openrouter/auth/key`
- OpenRouter route: `GET https://openrouter.ai/api/v1/auth/key`

### Security Boundary

- The decrypted OpenRouter API key must never be returned to the browser.
- Proxy logs must not include the raw OpenRouter key.
- Frontend code should treat OpenRouter-authenticated routes as backend-mediated unless the route is explicitly public, such as model listing.

### Current Exceptions

- `OpenRouterModelsAPI` is a direct browser call because the models endpoint is public.
- `OpenRouterChatAPI` and `postChatStream()` go through Story Vault endpoints (`/api/PostChat` and `/api/PostChatStream`) because the backend does more than simple path forwarding for chat generation.

## LLM Request Usage

All LLM requests flow through `OpenRouterChatAPI`: plain requests use
`postChat()`, live chat/reasoning uses `postChatStream()`, and schema-constrained
work uses `postStructuredChat()`.

Reusable Story Vault context is assembled before transport by
`LLMMessageContextService`. Its source flags are false by default, and each
pipeline declares its own selection near its prompt construction. The generic
builder knows only reusable sources and projection mechanics; response prompts,
feedback, target entities, schemas, labels, models, and request settings remain
owned by the calling feature.

Chat continuation deliberately appends its response prompt as the terminal
`user` message. This avoids the trailing-system-message ordering that breaks
some newer models.

`RequestTracker` records projection and rendered-section traces for inspection.
Text generation adds its own task-specific appended-source labels. During
regeneration, the target response and later projected messages are reported as
`regeneration-truncated`, matching the messages actually sent.

### Model Resolution Hierarchy

Each call site resolves the LLM model in this order:
1. **Per-prompt model** — set alongside each system prompt or plan definition
2. **Global default model** — from `SystemSettings.chatGenerationSettings.model`
3. **OpenRouter default** — if no model is specified, OpenRouter uses its own default

### Streaming Chat and Reasoning

| Caller | File | Method | Model Source |
|--------|------|--------|-------------|
| `TextGenerationService` | `Chat/services/ChatGeneration/TextGenerationService.ts` | `generateResponse()` | Global default |
| `TextGenerationService` | `Chat/services/ChatGeneration/TextGenerationService.ts` | `generateReasoning()` | Reasoning prompt override, then global default |
| `TextGenerationService` | `Chat/services/ChatGeneration/TextGenerationService.ts` | `regenerateResponse()` | Global default |

### Chapter Generation

| Caller | File | Method | Model Source |
|--------|------|--------|-------------|
| `ChapterGenerationService` | `Chat/services/ChatGeneration/ChapterGenerationService.ts` | `generateChapterDraft()` | `SystemPrompts.chapterSummaryModel` |
| `BookGenerationService` | `Chat/services/ChatGeneration/BookGenerationService.ts` | `generateBookSummary()` / `generateBookTitle()` | Corresponding Book prompt model |

### Image Prompt Generation

| Caller | File | Method | Model Source |
|--------|------|--------|-------------|
| `ImageGenerator` | `Images/services/ImageGenerator.ts` | `generatePrompt()` | `SystemPrompts.defaultImageModel` |
| `ImageGenerator` | `Images/services/ImageGenerator.ts` | `generatePromptWithFeedback()` | `SystemPrompts.defaultImageModel` |

### Plan Generation

| Caller | File | Method | Model Source |
|--------|------|--------|-------------|
| `PlanGenerationService` | `Plans/services/PlanGenerationService.ts` | `regeneratePlanFromMessage()` | `Plan.model` (per-plan) |
| `PlanGenerationService` | `Plans/services/PlanGenerationService.ts` | `regeneratePlan()` (private) | `Plan.model` (per-plan) |
| `PlanGenerationService` | `Plans/services/PlanGenerationService.ts` | `generateSuggestions()` | `Plan.suggestionModel` (per-plan) |

### Maintenance and Structured Analysis

- Message compression
- Agent intent analysis
- Active-character selection and Character Sheet synchronization
- Continuity History selection and maintenance
- Story, Chapter, Book, Plan, and new-content discussions

The code-derived request-by-request matrix, including present and missing
context for each pipeline, lives in
`artifacts/context/story-vault-llm-request-context-inventory-2026-07-26.html`.

### Story Generation

| Caller | File | Method | Model Source |
|--------|------|--------|-------------|
| `StoryGeneratorModal` | `StoryEditor/components/StoryGeneratorModal.tsx` | `handleRun()` | User-selected (defaults to `SystemPrompts.newStoryModel`) |

## Directory Structure

```
OpenRouter/
  components/
    OpenRouterKeyInput.tsx
    OpenRouterKeyManager.tsx
  hooks/
    useOpenRouterKey.ts
  services/
    OpenRouterChatAPI.ts
    OpenRouterKeyAPI.ts
```
