# Grok Feature

## Overview

The Grok feature manages the Grok API key lifecycle — validation, storage, and updates. Grok (by xAI) is the LLM provider used for all AI text generation in Story Vault. A valid Grok key is required before users can access the main application.

## Components

### `GrokKeyInput`

A simple form displayed during onboarding (on the landing page) when no Grok key exists. Encrypts the key client-side via `EncryptionManager` before sending it to the backend for storage.

### `GrokKeyManager`

A full-featured key management component used in the System Settings page. Displays the current key status (valid/invalid) and provides an update form with:
- Validation (non-empty check)
- Encrypted storage via `EncryptionManager`
- Toast notifications for success/error feedback
- Loading states during save operations

## Hooks

### `useGrokKey`

A singleton-backed hook that manages the Grok key validation state across the entire app. Features:

- **Shared state** — uses a module-level singleton so all component instances see the same status
- **Lazy initialization** — only fetches key status once on first mount
- **Listener pattern** — all hook instances are notified when key status changes
- **Encryption init** — triggers `EncryptionManager.ensureKeysInitialized()` when a valid key is confirmed

Returns `{ hasValidGrokKey, refreshGrokKeyStatus }`.

## Services

### `GrokChatAPI`

The HTTP client for sending chat messages to the Grok LLM via the Story Vault backend. It:
- Sends the encrypted Grok key as a header for backend decryption
- Includes system settings (model override, generation settings)
- Returns the LLM's text reply

### `GrokKeyAPI`

The HTTP client for Grok key management:
- `hasValidGrokKey()` — checks if a valid key exists (200 = valid, 404 = not found)
- `saveGrokKey(encryptedKey)` — persists a new encrypted Grok key

## Directory Structure

```
Grok/
  components/
    GrokKeyInput.tsx
    GrokKeyManager.tsx
  hooks/
    useGrokKey.ts
  services/
    GrokChatAPI.ts
    GrokKeyAPI.ts
```
