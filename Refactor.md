# Refactor Plan

## 2. Architectural Issues

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

## Priority Order

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 3 | Singleton/boilerplate consolidation (§3a, §3c) | Medium — DX improvement | Medium |
| 5 | Naming & convention standardization (§4) | Medium — reduces cognitive load | Medium |
| 6 | Error handling gaps (§5) | Medium — reliability | Medium |
| 7 | Hooks bypass Dependencies.ts (§3d) | Low — convention compliance | Small |
| 8 | Unsafe casts (§3b) | Low — type safety | Small |
| 9 | ChatGeneration god class (§2d) | Low — not blocking yet | Medium |

