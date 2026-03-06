# Chat Feature

## Overview

The Chat feature is the core of Story Vault. It provides an interactive chat interface for collaborative storytelling with AI. Users create chats with a title, story context, and prompt, then exchange messages with the Grok LLM to develop narratives. The feature supports text generation, image generation, chapter organization, and message editing — all backed by an event sourcing architecture.

## Pages

### `ChatMenuPage`

The main hub listing all user chats, sorted by recent activity. Provides navigation to:
- Individual chats
- Chat creation wizard
- System settings, system prompts, and default image models

### `ChatPage`

The active chat view containing:
- **ChatControls** — top bar with navigation and chat-level actions
- **ChatEntriesList** — scrollable message list displaying user messages, assistant responses, chapters, and generated images
- **FlowAccordion** — expandable panel showing plans, memories, and image model settings for the current chat
- **ChatInput** — message input with send, image generation, and loading state indicators

Supports custom background photos per chat.

### `ChatEditorPage`

Edit chat settings including title, prompt, custom prompt, and background photo. Also provides chat deletion.

## Components

### Chat/

- **ChatInput** — textarea with send and image generation action buttons; supports expanded/minimized modes
- **ChatEntriesList** — renders the message timeline
- **ChatControls/** — top bar actions (back, edit, chapter management)
- **ChatEntries/** — individual message entry components (user, assistant, chapter, image)
- **Flow/** — collapsible panel for plans, memories, and image models

### ChatCreationWizard/

A multi-step wizard for creating new chats:
1. **TitleStep** — set chat title and initial story
2. **PromptStep** — configure the AI prompt (defaults to system third-person prompt)
3. **ChatSettingsStep** — additional settings like background photo

### ChatEditor/

- **ChatDeleteControl** — delete button with confirmation modal
- **BackgroundPhotoUploader** — upload or generate background images for chats

### ChatMenuList/

- **ChatList** / **ChatListItem** — renders the list of existing chats
- **CreateChatButton** — navigates to the creation wizard
- **SystemSettingsButton**, **SystemPromptsButton**, **DefaultImageModelsButton** — quick navigation buttons

## Hooks

| Hook | Purpose |
|------|---------|
| `useChatGeneration` | Manages text and image generation with loading/status states |
| `useChatSettings` | Loads and provides chat settings (title, prompt, background) |
| `useChatInputCache` | Persists draft input text per chat across navigation |
| `useChatInputExpansion` | Toggles expanded/minimized input textarea |
| `useChatDeletion` | Handles chat deletion with cache invalidation |
| `useDeleteChat` | Lower-level chat deletion hook |
| `useCreateChat` | Chat creation with React Query mutation |
| `useEnsureChatInitialization` | Ensures CQRS event store and projections are loaded for a chat |
| `useUserChatProjection` | Subscribes to the user-facing chat projection for reactive UI updates |

## Services

### Chat/

- **ChatAPI** — HTTP client for chat CRUD operations against the backend
- **ChatSettings** — TypeScript interface for chat configuration (title, prompt, background)
- **ChatSettingsService** / **ChatSettingsManagedBlob** — persistence layer for per-chat settings
- **ChatInputCache** — in-memory cache for draft input text
- **RecentChatsService** / **RecentChatsManagedBlob** — tracks and sorts chats by recent activity

### ChatGeneration/

- **TextGenerationService** — orchestrates text response generation: updates plans → builds LLM context → calls Grok API → saves response
- **ImageGenerationService** — orchestrates image generation: generates prompt via LLM → triggers CivitAI job → saves job reference
- **ChapterGenerationService** — generates chapter titles and summaries via LLM
- **LLMMessageContextService** — builds the message array sent to the LLM, including memories, plans, and chapter context
- **GenerationOrchestrator** — base class providing loading state, status updates, and subscriber notifications

## Event Sourcing Integration

All chat state changes flow through the CQRS layer:

1. User action → `ChatService` creates an event
2. Event persisted to `ChatEventStore` (encrypted)
3. `UserChatProjection` processes event → UI updates
4. `LLMChatProjection` processes event → LLM context stays current

## Directory Structure

```
Chat/
  components/
    Chat/
      ChatControls/
      ChatEntries/
      ChatEntriesList.tsx
      ChatInput.tsx
      Flow/
    ChatCreationWizard/
      ChatCreationWizard.tsx
      ChatSettingsStep.tsx
      PromptStep.tsx
      TitleStep.tsx
    ChatEditor/
      BackgroundPhotoUploader.tsx
      ChatDeleteControl.tsx
    ChatMenuList/
      ChatList.tsx
      ChatListItem.tsx
      CreateChatButton.tsx
      DefaultImageModelsButton.tsx
      SystemPromptsButton.tsx
      SystemSettingsButton.tsx
  hooks/
    useChatDeletion.ts
    useChatGeneration.ts
    useChatInputCache.ts
    useChatInputExpansion.ts
    useChatSettings.ts
    useCreateChat.test.tsx
    useDeleteChat.ts
    useEnsureChatInitialization.ts
    useUserChatProjection.ts
  pages/
    ChatEditorPage.tsx
    ChatMenuPage.tsx
    ChatPage.tsx
  services/
    Chat/
      ChatAPI.ts
      ChatInputCache.ts
      ChatSettings.ts
      ChatSettingsManagedBlob.ts
      ChatSettingsService.ts
      RecentChatsManagedBlob.ts
      RecentChatsService.ts
    ChatGeneration/
      ChapterGenerationService.ts
      GenerationOrchestrator.ts
      ImageGenerationService.ts
      LLMMessageContextService.ts
      TextGenerationService.ts
```
