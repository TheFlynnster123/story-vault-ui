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
