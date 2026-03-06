# Memories Feature

## Overview

The Memories feature allows users to attach persistent notes ("memories") to individual chats. Memories provide additional context that is included in LLM generation requests, helping the AI maintain consistency about characters, settings, plot points, or any other details the user wants to preserve across the conversation.

## Pages

### `MemoriesPage`

A full-page editor for managing a chat's memories. Users can:
- Add new memories
- Edit existing memory content via text areas
- Delete memories with confirmation modals
- Changes auto-save via debounced persistence

## Components

### `MemoriesSection`

A compact, collapsible preview displayed in the chat's Flow accordion. Shows a count of memories and expandable previews of each memory's content. Clicking navigates to the full `MemoriesPage`.

## Hooks

### `useMemories`

Loads memories for a given chat ID and subscribes to changes for reactive updates. Returns `{ memories, isLoading }`.

## Services

### `MemoriesService`

Per-chat service for memory CRUD operations:
- `get()` — retrieves all memories
- `save()` / `saveDebounced()` — persists memories (with optional debounce for rapid edits)
- `saveMemory(memory)` — upserts a single memory
- `removeMemory(memoryId)` — deletes a memory by ID
- `subscribe(callback)` — notifies listeners on data changes

### `MemoriesManagedBlob`

Handles encrypted blob storage persistence for memories data.

### `Memory`

TypeScript interface:
```typescript
interface Memory {
  id: string;
  content: string;
}
```

## Integration with Chat Generation

Memories are injected into the LLM context via `LLMMessageContextService` during text generation, ensuring the AI considers all saved context when crafting responses.

## Directory Structure

```
Memories/
  components/
    MemoriesSection.tsx
  hooks/
    useMemories.ts
  pages/
    MemoriesPage.tsx
  services/
    MemoriesManagedBlob.ts
    MemoriesService.ts
    Memory.ts
```
