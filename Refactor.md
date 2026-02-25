# Refactor Plan

## Guiding Principle

The codebase currently organizes by **element type** (pages/, components/, services/), which scatters related files across many folders. The refactor will reorganize by **concept** so that a page, its components, hooks, and services all live together. This should make features easier to find, reason about, and modify.

---

## 1. Folder Structure — Reorganize by Concept

### Current Structure (scattered by type)

To understand a single feature like "Memories", you currently have to look in:

- `pages/MemoriesPage.tsx`
- `components/Chat/useMemories.ts`
- `components/Chat/Flow/MemoriesSection.tsx`
- `services/ChatGeneration/MemoriesService.ts`
- `services/ChatGeneration/Memory.ts`
- `services/Blob/MemoriesManagedBlob.ts`

This is repeated for every concept — Images, Prompts, Plans, Settings, etc.

### Proposed Structure (grouped by concept)

```
src/
  features/
    Chat/
      pages/
        ChatPage.tsx
        ChatEditorPage.tsx
        ChatMenuPage.tsx
      components/
        ChatEntriesList.tsx
        ChatInput.tsx
        ChatInput.styled.ts
        ChatControls/
          ChatControls.tsx
          CreateChapterModal.tsx
          useAddChapter.ts
        ChatEntries/
          Chapter/
          ChatEntryButtons/
          ChatEntry.tsx
          ChatMessage.styled.ts
          CivitJobMessage.tsx
          ChapterMessage.tsx
          StoryMessage.tsx
          SystemMessage.tsx
          UserMessage.tsx
        ChatCreationWizard/
          ChatCreationWizard.tsx
          ChatCreationWizardState.ts
          ChatSettingsStep.tsx
          PromptStep.tsx
          TitleStep.tsx
          useCreateChat.ts
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
          useChats.ts
        Flow/
          (all Flow components)
      hooks/
        useChatGeneration.ts
        useChatSettings.ts
        useChatInputCache.ts
        useUserChatProjection.ts
        useEnsureChatInitialization.ts
        useExpandableTextarea.ts
        useDeleteChat.ts
        useChatImageModels.ts
      services/
        ChatAPI.ts
        ChatInputCache.ts
        ChatSettings.ts
        ChatSettingsService.ts
        RecentChatsService.ts
        templates/

    ChatGeneration/
      services/
        ChatGeneration.ts
        LLMMessageContextService.ts
      tests/
        LLMMessageContextService.test.ts

    Memories/
      pages/
        MemoriesPage.tsx
      components/
        MemoriesSection.tsx        (currently in Flow/)
      hooks/
        useMemories.ts             (currently in Chat/)
      services/
        MemoriesService.ts
        Memory.ts
        MemoriesManagedBlob.ts     (currently in Blob/)

    Plans/
      pages/
        PlanPage.tsx
      components/
        PlanSection.tsx            (currently in Flow/)
      hooks/
        usePlanCache.ts            (currently in Chat/)
      services/
        PlanService.ts
        Plan.ts
        PlansManagedBlob.ts        (currently in Blob/)

    Images/
      pages/
        ChatImageModelsPage.tsx
        ChatImageModelEditPage.tsx
        ChatImageModelTemplatePage.tsx
        DefaultImageModelsPage.tsx
        ImageModelEditPage.tsx
        ImageSettingsPage.tsx
      components/
        CivitaiKeyManager.tsx
        ImageModelList.tsx
        ImageModelListItem.tsx
        ModelFromImage.tsx
        ModelSampleImage.tsx
        SampleImageGenerator.tsx
        SchedulerCombobox.tsx
        ImageModelViewComponents/
      hooks/
        useCivitJob.ts
        useCivitaiKey.ts
        useImageModels.ts
        useChatImageModels.ts      (currently in Chat/)
      services/
        ChatImageModelService.ts
        CivitJob.ts
        CivitJobOrchestrator.ts
        ImageGenerator.ts
        PhotoStorageService.ts
        ChatImageModelsManagedBlob.ts
        ImageModelsManagedBlob.ts
        api/
          CivitJobAPI.ts
          CivitKeyAPI.ts
        modelGeneration/
          (all mapper/service files)

    Prompts/
      pages/
        SystemPromptsPage.tsx
      components/
        PromptInput.tsx
        SystemPromptsEditor.tsx
      hooks/
        usePromptHighlight.ts
        useSystemPrompts.ts
      services/
        SystemPromptsService.ts
        SystemPrompts.ts
        SystemPromptsManagedBlob.ts

    SystemSettings/
      pages/
        SystemSettingsPage.tsx
      components/
        SystemSettingsEditor.tsx
      hooks/
        useSystemSettings.ts
      services/
        SystemSettingsService.ts
        SystemSettings.ts
        SystemSettingsManagedBlob.ts

    StoryEditor/
      pages/
        StoryEditorPage.tsx
      components/
        StoryGeneratorModal.tsx

    Grok/
      components/
        GrokKeyInput.tsx
        GrokKeyManager.tsx
      hooks/
        useGrokKey.ts
      services/
        GrokChatAPI.ts
        GrokKeyAPI.ts

    AI/
      components/
        EditPromptButton.tsx
        GenerateButton.tsx
        ModelSelect.tsx

  core/
    cqrs/
      ChatEventService.ts
      ChatEventStore.ts
      ChatService.ts
      LLMChatProjection.ts
      UserChatProjection.ts
      events/
      tests/
    auth/
      AuthAPI.ts
      EncryptionManager.ts
      ProtectedRoute.tsx
      useAuth0Setup.ts
    blob/
      BlobAPI.ts
      ManagedBlob.ts
    config/
      Config.ts                    (currently in components/Common/)
    errors/
      ErrorService.ts              (currently in components/Common/)
    utils/
      MessageUtils.ts
    theme/
      Theme.ts
    shared-components/
      ConfirmModal.tsx
      Page.tsx

  Dependencies.ts
  App.tsx
  main.tsx
```

### Key Decisions

- **`features/`** holds domain-grouped folders. Each feature owns its pages, components, hooks, and services.
- **`core/`** holds cross-cutting infrastructure (CQRS, auth, blob persistence, config, errors) that multiple features depend on.
- **`ChatGeneration/`** stays separate from `Chat/` because it orchestrates across features (LLM context pulls from Plans, Memories, Chat settings, Prompts).
- **Hooks that clearly belong to a feature** (like `useMemories`, `usePlanCache`, `useChatImageModels`) move into that feature's `hooks/` folder — they're currently scattered in `components/Chat/`.
- **ManagedBlob subclasses** move into their feature folders. The base `ManagedBlob.ts` stays in `core/blob/`.
- **`components/Common/`** is dissolved: `Config.ts` → `core/config/`, `ErrorService.ts` → `core/errors/`, `Theme.ts` → `core/theme/`, `ConfirmModal.tsx` → `core/shared-components/`.

### Migration Strategy

This will be a large rename/move operation. To avoid a broken app during migration:
1. Move one feature at a time, updating all imports before moving the next.
2. Run `npm run build` after each feature to verify no broken imports.
3. Update `Dependencies.ts` import paths as services move.
4. The test suite should pass after each feature migration.

---

## 2. Architectural Issues

### 2a. Hidden Side-Effects in "Build" Methods

**Problem:** `LLMMessageContextService.buildGenerationRequestMessages()` silently triggers N LLM calls by calling `PlanService.generateUpdatedPlans()`. A method named "build" implies pure assembly — not expensive, mutating API requests.

**Fix:** Move plan regeneration out of the context builder. `ChatGeneration.generateResponse()` should explicitly call plan regeneration before building context:

```typescript
// In ChatGeneration.generateResponse():
await d.PlanService(this.chatId).generateUpdatedPlans(chatMessages);
const requestMessages = await d.LLMMessageContextService(this.chatId)
  .buildGenerationRequestMessages();  // Now purely assembles messages
```

### 2b. PlanService Split Personality

**Problem:** `PlanService` is both a CRUD data service *and* an LLM generation service. Compare with `MemoriesService` which is cleanly just CRUD.

**Fix:** Extract `generateUpdatedPlans()` and `generatePlanContent()` into a `PlanGenerationService` (or fold them into `ChatGeneration`). `PlanService` becomes pure CRUD like `MemoriesService`.

### 2c. Optimistic Projection Updates Without Rollback

**Problem:** In `ChatEventService.addEvent()`, projections are updated *before* the event is persisted to storage. If persistence fails, the UI shows state that doesn't exist in storage.

**Fix:** Either:
- Persist first, then update projections (simpler, slightly slower UX)
- Keep optimistic updates but add rollback on failure (more complex, better UX)

### 2d. ChatGeneration Growing Into a God Class

**Problem:** `ChatGeneration` has 6 public async methods covering text generation, image generation, regeneration with/without feedback, chapter summaries, and chapter titles. Each follows the same loading/status/try-finally pattern.

**Fix:** Consider extracting into focused services:
- `TextGenerationService` — generateResponse, regenerateResponse
- `ImageGenerationService` — generateImage, regenerateImage
- `ChapterGenerationService` — generateChapterSummary, generateChapterTitle

Each follows the same orchestration pattern and can share a common base or strategy.

---

## 3. Pattern Inconsistencies

### 3a. Singleton/Instantiation Chaos in Dependencies.ts

**Problem:** Three patterns coexist with no clear rule:
- `new Constructor()` (~22 services) — transient, new instance every call
- `getInstance()` (~16 services) — cached singleton per chatId
- Global import (1 — `QUERY_CLIENT` from `App.tsx`)

**Fix:**
- Document which services should be singletons vs transient and why.
- Extract a generic `getOrCreateInstance<T>()` helper to replace the ~10 copy-pasted singleton map patterns.
- Move `QUERY_CLIENT` creation out of `App.tsx` into `core/` so Dependencies.ts doesn't import from a React component.

### 3b. Unsafe `as Type` Casts on getInstance Calls

**Problem:** Multiple `getInstance` functions return `T | undefined` but are cast to `T` in `Dependencies.ts`, hiding potential `undefined` runtime errors.

**Fix:** Make getInstance functions throw internally if the instance isn't found (or if chatId is null/invalid), so the return type is genuinely non-nullable. No casts needed.

### 3c. ManagedBlob Subclass Boilerplate

**Problem:** 8 ManagedBlob subclasses each contain zero unique behavior — they only set a blob name string. ~130 lines of pure boilerplate across 8 files.

**Fix:** Make `ManagedBlob` concrete by accepting `blobName` as a constructor parameter instead of an abstract method. Create a factory function:

```typescript
// Replaces 8 entire files:
export const getChatSettingsBlob = createManagedBlob<ChatSettings>("chat-settings", "per-chat");
export const getMemoriesBlob = createManagedBlob<Memory[]>("memories", "per-chat");
export const getPlansBlob = createManagedBlob<Plan[]>("plan", "per-chat");
// ... etc
```

### 3d. Hooks Bypassing Dependencies.ts

**Problem:** `useChatInputCache` imports `getChatInputCacheInstance` directly. `usePlanCache` imports `getPlanServiceInstance` directly. Both violate the project convention of always using `d.Something()`.

**Fix:** Add these to `Dependencies.ts` and update the hooks to use `d.ChatInputCache(chatId)` and `d.PlanService(chatId)`.

---

## 4. Naming & Convention Inconsistencies

### 4a. Method Naming Style

**Problem:** No consistent convention across services:
- `PlanService`: PascalCase methods + camelCase arrow functions
- `MemoriesService`: PascalCase arrow functions
- `LLMMessageContextService`: camelCase methods
- `ChatGeneration`: camelCase methods

**Fix:** Pick one convention (camelCase methods is the React ecosystem norm) and apply consistently. Public API methods should all follow the same style.

### 4b. Hook Parameter Style

**Problem:**
- `useChatGeneration` takes `{ chatId }` (destructured object)
- `useUserChatProjection` takes `chatId: string` (plain parameter)
- `useChatInputCache` takes `chatId: string | null` (nullable)

**Fix:** Standardize on `chatId: string` as a plain parameter. Remove `null` variants — callers should guard before calling.

### 4c. Hook Error Handling

**Problem:** Inconsistent strategies:
- `useChatGeneration.generateResponse` — no error handling (propagates)
- `useChatGeneration.regenerateResponse` — catches and logs via `d.ErrorService()`
- `useChatImageModels` — catches, sets error state, uses `console.error`
- `useDeleteChat` — no error handling at all

**Fix:** Establish a standard pattern. Suggestion: hooks that call services should catch errors, notify via `ErrorService`, and expose an `error` state for UI display.

### 4d. File/Export Name Mismatches

**Problem:**
- `useDeleteChat.ts` exports `useChatDeletion`
- `useExpandableTextarea.ts` exports `useChatInputExpansion` (with a backward-compat alias)

**Fix:** Rename files to match their primary exports, or vice versa.

### 4e. Function Declaration Style

**Problem:** `useUserChatProjection` uses `function` declaration while every other hook uses `const arrow`.

**Fix:** Use `const arrow` consistently (matches project convention).

---

## 5. Error Handling Gaps

### 5a. Silent Persistence Failures

**Problem:** `ChatEventStore.saveEvent()` returns `boolean` instead of throwing. The caller in `ChatEventService` doesn't check the return value — a failed persist is silently lost.

**Fix:** Make `saveEvent()` throw on failure. `ChatEventService.addEvent()` should catch and rollback projection state.

### 5b. Silent Decryption Failures

**Problem:** In `ChatEventStore.getEvents()`, failed decryptions log an error but silently skip the event. This causes silent data loss where projection state doesn't match what was persisted.

**Fix:** Surface decryption failures to the user (via ErrorService notification) so they know data may be missing.

### 5c. PlanService Constructor Race Condition

**Problem:** `PlanService` constructor calls `initializePlansIfNeeded()` which is async — but the promise is never awaited. If `GetPlans()` is called before the load finishes, it returns `[]`.

**Fix:** Use the same stored-promise pattern that `ChatEventService` uses for its `Initialize()` method.

---

## 6. Performance (Future — Not Blocking)

These are noted for awareness but not prioritized now:

- **Subscriber notification storms during event replay:** Both projections notify subscribers on every event during initialization. For large chats, this causes hundreds of unnecessary React re-renders. Fix: batch notifications, only notify after full replay.
- **Linear scans over message arrays:** `find()` is used throughout projections. For large chats, an ID-indexed `Map` would be faster.
- **`UserChatMessage.data` typed as `any`:** Breaks type safety. Should use a discriminated union by message type.

---

## Priority Order

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Folder restructure by concept (§1) | High — directly addresses the "klugey" feeling | Large |
| 2 | Hidden side-effects in build methods (§2a) | High — correctness risk | Small |
| 3 | PlanService split (§2b) | Medium — cleaner separation | Small |
| 4 | Singleton/boilerplate consolidation (§3a, §3c) | Medium — DX improvement | Medium |
| 5 | Naming & convention standardization (§4) | Medium — reduces cognitive load | Medium |
| 6 | Error handling gaps (§5) | Medium — reliability | Medium |
| 7 | Hooks bypass Dependencies.ts (§3d) | Low — convention compliance | Small |
| 8 | Unsafe casts (§3b) | Low — type safety | Small |
| 9 | ChatGeneration god class (§2d) | Low — not blocking yet | Medium |
| 10 | Optimistic update rollback (§2c) | Low — rare failure case | Medium |
| 11 | Performance improvements (§6) | Low — future concern | Medium |
