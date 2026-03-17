# Chat Entries List — Refresh Analysis

> **Purpose:** Catalogue every scenario that causes the virtualized `ChatEntriesList` (react-virtuoso `<Virtuoso>`) to re-render, and propose a plan to reduce unnecessary visual disruptions (flashing, flickering, rescaling).

---

## How the Refresh Chain Works

```
ChatEventService.AddChatEvent(event)
  → UserChatProjection.process(event)   // mutates internal Messages[]
    → notifySubscribers()               // fires every registered callback
      → useUserChatProjection.onNotify  // calls setMessages(GetMessages())
        → ChatEntriesList re-renders    // Virtuoso receives new `data` array
```

`GetMessages()` calls `.filter()` each time, so React always sees a **new array reference** — even when the visible messages haven't changed.

---

## Comprehensive Refresh Trigger List

### 1. Initialization — **N notifications for N historical events** ⚠️ CRITICAL

`ChatEventService.initializeProjections()` replays every stored event through `UserChatProjection.process()`. Each `process()` call triggers `notifySubscribers()`.

**A chat with 100 events fires 100 subscriber callbacks during load**, each of which calls `setMessages()` in the hook. React batches synchronous state updates within the same microtask, but because `onNotify` is `async` (it `await`s `GetMessages()`), each notification may result in a separate render.

| Source | File | Line |
|--------|------|------|
| `initializeProjections` loop | `ChatEventService.ts` | 48-54 |
| `process()` always calls `notifySubscribers()` | `UserChatProjection.ts` | 81 |

### 2. Hook Mount — 1 notification

`useUserChatProjection` calls `onNotify()` immediately after subscribing to seed the initial state.

| Source | File | Line |
|--------|------|------|
| `onNotify()` on mount | `useUserChatProjection.ts` | 24 |

### 3. User Sends a Message — 1 notification

`ChatService.AddUserMessage()` → single `AddChatEvent` → single `process()` → single `notifySubscribers()`.

| Source | File | Line |
|--------|------|------|
| `AddUserMessage` | `ChatService.ts` | 38-40 |

### 4. Assistant Response Generated — 1 notification

`TextGenerationService.generateResponse()` → `ChatService.AddAssistantMessage()` → same chain as above.

| Source | File | Line |
|--------|------|------|
| `AddAssistantMessage` | `ChatService.ts` | 48-50 |

### 5. Regenerate Response — **2 notifications** ⚠️

`TextGenerationService.regenerateResponse()` calls `DeleteMessage()` (notification 1) then `AddAssistantMessage()` (notification 2). The list briefly shows the deleted state before the new message appears.

| Source | File | Line |
|--------|------|------|
| `DeleteMessage` then `AddAssistantMessage` | `TextGenerationService.ts` | 49, 62 |

### 6. Add Plan Message — **2 notifications** ⚠️

`ChatService.AddPlanMessage()` fires a `PlanHidden` event (notification 1) followed by a `PlanCreated` event (notification 2). Between the two, hidden plan messages disappear before the new one is inserted.

| Source | File | Line |
|--------|------|------|
| `PlanHidden` then `PlanCreated` | `ChatService.ts` | 132-140 |

### 7. Plan Auto-Regeneration — **2 notifications per due plan** ⚠️

When `PlanGenerationService.onMessageSent()` detects plans are due, it calls `regeneratePlan()` for each, which goes through `ChatService.AddPlanMessage()` (see #6). Multiple due plans run in parallel, so notifications interleave.

| Source | File | Line |
|--------|------|------|
| `regenerateDuePlans` | `PlanGenerationService.ts` | 178-188 |

### 8. Chapter Created — 1 notification

`ChatService.AddChapter()` → single `ChapterCreated` event → single notification.

| Source | File | Line |
|--------|------|------|
| `AddChapter` | `ChatService.ts` | 81-98 |

### 9. Chapter Edited — 1 notification

| Source | File | Line |
|--------|------|------|
| `EditChapter` | `ChatService.ts` | 101-113 |

### 10. Chapter Deleted — 1 notification

| Source | File | Line |
|--------|------|------|
| `DeleteChapter` | `ChatService.ts` | 116-118 |

### 11. Image Generated — 1 notification

`ImageGenerationService.generateImage()` → `ChatService.CreateCivitJob()` → single event.

| Source | File | Line |
|--------|------|------|
| `CreateCivitJob` | `ChatService.ts` | 53-55 |

### 12. Image Regenerated — **2 notifications** ⚠️

`ImageGenerationService.regenerateImage()` calls `DeleteMessage()` (notification 1) then `CreateCivitJob()` (notification 2).

| Source | File | Line |
|--------|------|------|
| `DeleteMessage` then `CreateCivitJob` | `ImageGenerationService.ts` | 49-62 |

### 13. Message Edited — 1 notification

| Source | File | Line |
|--------|------|------|
| `EditMessage` | `ChatService.ts` | 58-63 |

### 14. Message Deleted — 1 notification

| Source | File | Line |
|--------|------|------|
| `DeleteMessage` | `ChatService.ts` | 66-68 |

### 15. Delete Message and All Below — 1 notification

Uses the batched `MessagesDeleted` event, so only 1 notification.

| Source | File | Line |
|--------|------|------|
| `DeleteMessageAndAllBelow` | `ChatService.ts` | 71-78 |

### 16. Story Initialized — 1 notification

| Source | File | Line |
|--------|------|------|
| `InitializeStory` | `ChatService.ts` | 27-29 |

### 17. Story Edited — 1 notification

| Source | File | Line |
|--------|------|------|
| `EditStory` | `ChatService.ts` | 32-34 |

### 18. `isLastMessage` prop changes on every list update

`ChatEntriesList.itemContent` computes `isLastMessage={index === messages.length - 1}`. When a message is added, the previously-last item's `isLastMessage` prop flips from `true` to `false`, and `ChatEntry` is **not memoized**, so it always re-renders all visible items on any data change.

| Source | File | Line |
|--------|------|------|
| `isLastMessage` computed inline | `ChatEntriesList.tsx` | 28 |
| `ChatEntry` — no `React.memo` | `ChatEntry.tsx` | 22 |

### 19. CivitJob Polling (indirect)

`CivitJobMessage` uses `useCivitJob` which polls via React Query every 5 seconds while an image is pending. This re-renders the individual `CivitJobMessage`, but since `ChatEntry` is not memoized, a parent re-render already re-renders it.

| Source | File | Line |
|--------|------|------|
| `useCivitJob` poll interval | `useCivitJob.ts` | 6 |

---

## Summary of Unnecessary Refreshes

| Scenario | Notifications | Ideal | Excess |
|----------|:---:|:---:|:---:|
| Initialization (N events) | **N** | 1 | **N − 1** |
| Regenerate response | 2 | 1 | 1 |
| Add plan message | 2 | 1 | 1 |
| Regenerate image | 2 | 1 | 1 |
| Plan auto-regen (K due plans) | 2K | K | K |
| Every notification → full item re-render (no memo) | all visible items | only changed items | many |

---

## Suggested Plan (Not Yet Implemented)

### Fix 1: Batch Notifications During Initialization ✅ IMPLEMENTED

**Problem:** `initializeProjections()` fires a subscriber notification per event.

**Solution:** Added `processBatch(events: ChatEvent[])` to both `UserChatProjection` and `LLMChatProjection`. Processes all events but only calls `notifySubscribers()` once at the end. `ChatEventService.initializeProjections()` now calls `processBatch()`.

**Impact:** Reduces initialization from **N notifications to 1**.

### Fix 2: Batch Multi-Event Operations via `AddChatEvents` ✅ PARTIALLY IMPLEMENTED

**Problem:** `AddPlanMessage`, `regenerateResponse`, and `regenerateImage` each emit 2 events sequentially, producing 2 separate notifications.

**Solution:** Added `AddChatEvents(events: ChatEvent[])` to `ChatEventService` that processes all events through projections via `processBatch`, then persists them via `ChatEventStore.addChatEvents()`.

Updated caller:
- ✅ `ChatService.AddPlanMessage` → submits `[hideEvent, createEvent]` in one call

Not batched (by design):
- `TextGenerationService.regenerateResponse` — the delete must be applied before building LLM context, and the new message isn't known until after the LLM responds. The multi-second gap between events provides useful visual feedback (old message disappears → loading → new message appears).
- `ImageGenerationService.regenerateImage` — same pattern: delete must precede LLM prompt generation, and the create event is only known after external API calls complete.

**Impact:** Reduces `AddPlanMessage` from **2 notifications to 1**. Regeneration operations intentionally keep 2 notifications for correct context and UX.

### Fix 3: Memoize `ChatEntry` with `React.memo` ✅ IMPLEMENTED

**Problem:** `ChatEntry` is not memoized. Every time the messages array updates, Virtuoso re-renders all visible items.

**Solution:** Wrapped `ChatEntry` with `React.memo` and a reference equality comparator (`prev.message === next.message`).

**Prerequisite — Immutable Updates (Fix 3b):** `UserChatProjection` event handlers previously mutated message objects in-place (e.g., `msg.content = newContent`). Because `GetMessages()` returns the same object references, `React.memo` could never detect property changes — `prev.message` and `next.message` were the same object, so all field comparisons returned `true`. This meant edits, chapter edits, and story edits would silently fail to re-render.

**Fix 3b:** Changed all mutation event handlers (`processMessageEdited`, `processStoryEdited`, `processChapterEdited`, `processMessageDeleted`, `processMessagesDeleted`, `processChapterCreated`, `processChapterDeleted`, `processPlanHidden`) to produce **new object references** via spread (`this.Messages[index] = { ...this.Messages[index], ...updates }`). A `replaceMessage` helper centralizes this pattern. Now `React.memo`'s reference equality check reliably detects which messages have changed.

**Why reference equality is safe:**
- Mutations always create a new object → changed messages get new references
- `GetMessages()` returns the same object references for unchanged messages → they pass the equality check and skip re-render
- Covers all properties (including `data`) without listing each field explicitly

**Impact:** Only the items whose props actually changed will re-render after a list update. Message edits, chapter edits, and story edits now correctly trigger re-renders.

### Fix 4: Stabilize the Messages Array Reference (Optional / Low Priority)

**Problem:** `GetMessages()` always returns a new array from `.filter()`, so React always sees a different reference.

**Suggestion:** Inside `useUserChatProjection`, compare the new messages with the previous ones using a shallow comparison of IDs + content, and only call `setMessages()` if something actually changed. Alternatively, cache the filtered result inside `UserChatProjection` and invalidate it only when `process()` modifies the underlying data.

**Impact:** Eliminates no-op re-renders when a notification fires but the visible messages haven't actually changed (e.g., a `PlanHidden` event that hides a plan already not in the filtered list).

### Implementation Priority

1. ✅ **Fix 1** (batch initialization) — Highest impact, lowest risk
2. ✅ **Fix 3** (memoize ChatEntry) — High impact, low risk
3. ✅ **Fix 3b** (immutable updates) — Critical for Fix 3 correctness
4. ✅ **Fix 2** (batch multi-event ops) — Medium impact, moderate risk (requires new API surface)
5. 🔲 **Fix 4** (stable references) — Low impact, low risk
