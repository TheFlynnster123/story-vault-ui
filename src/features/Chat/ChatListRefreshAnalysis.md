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

### Fix 1: Batch Notifications During Initialization

**Problem:** `initializeProjections()` fires a subscriber notification per event.

**Suggestion:** Add a `processBatch(events: ChatEvent[])` method to both `UserChatProjection` and `LLMChatProjection` that processes all events but only calls `notifySubscribers()` once at the end.

```
// UserChatProjection
public processBatch(events: ChatEvent[]): void {
  for (const event of events) {
    this.processEvent(event); // extracted from process(), no notify
  }
  this.notifySubscribers();
}
```

Update `ChatEventService.initializeProjections()` to call `processBatch()` instead of individual `process()` calls.

**Impact:** Reduces initialization from **N notifications to 1**. This is the highest-impact fix.

### Fix 2: Batch Multi-Event Operations via `AddChatEvents`

**Problem:** `AddPlanMessage`, `regenerateResponse`, and `regenerateImage` each emit 2 events sequentially, producing 2 separate notifications.

**Suggestion:** Add an `AddChatEvents(events: ChatEvent[])` method to `ChatEventService` that processes all events through projections (via `processBatch`), then persists them. Use the existing `ChatEventStore.addChatEvents()` API which already exists but is unused.

Update the callers:
- `ChatService.AddPlanMessage` → submit `[hideEvent, createEvent]` in one call
- `TextGenerationService.regenerateResponse` → submit `[deleteEvent, createEvent]` in one call
- `ImageGenerationService.regenerateImage` → submit `[deleteEvent, createEvent]` in one call

**Impact:** Reduces each of these operations from **2 notifications to 1**.

### Fix 3: Memoize `ChatEntry` with `React.memo`

**Problem:** `ChatEntry` is not memoized. Every time the messages array updates (even for a single new message), Virtuoso re-renders all visible items. Each `ChatEntry` creates child components unconditionally.

**Suggestion:** Wrap `ChatEntry` with `React.memo` and a custom comparator that checks `message.id`, `message.content`, `message.deleted`, `message.hidden`, and `isLastMessage`.

```
export const ChatEntry = React.memo<ChatEntryProps>(({ chatId, message, isLastMessage }) => {
  // ... existing implementation
}, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  prev.message.deleted === next.message.deleted &&
  prev.message.hidden === next.message.hidden &&
  prev.isLastMessage === next.isLastMessage
);
```

**Impact:** Only the items whose props actually changed will re-render after a list update.

### Fix 4: Stabilize the Messages Array Reference (Optional / Low Priority)

**Problem:** `GetMessages()` always returns a new array from `.filter()`, so React always sees a different reference.

**Suggestion:** Inside `useUserChatProjection`, compare the new messages with the previous ones using a shallow comparison of IDs + content, and only call `setMessages()` if something actually changed. Alternatively, cache the filtered result inside `UserChatProjection` and invalidate it only when `process()` modifies the underlying data.

**Impact:** Eliminates no-op re-renders when a notification fires but the visible messages haven't actually changed (e.g., a `PlanHidden` event that hides a plan already not in the filtered list).

### Implementation Priority

1. **Fix 1** (batch initialization) — Highest impact, lowest risk
2. **Fix 3** (memoize ChatEntry) — High impact, low risk
3. **Fix 2** (batch multi-event ops) — Medium impact, moderate risk (requires new API surface)
4. **Fix 4** (stable references) — Low impact, low risk
