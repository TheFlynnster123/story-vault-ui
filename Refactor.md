# Refactor Plan

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
| ~~3~~ | ~~Singleton/boilerplate consolidation (§3a, §3c)~~ | ~~Medium — DX improvement~~ | ✅ Done |
| 5 | Naming & convention standardization (§4) | Medium — reduces cognitive load | Medium |
| 6 | Error handling gaps (§5) | Medium — reliability | Medium |
| ~~7~~ | ~~Hooks bypass Dependencies.ts (§3d)~~ | ~~Low — convention compliance~~ | ✅ Done |
| 8 | Unsafe casts (§3b) | Low — type safety | Small |
| 9 | ChatGeneration god class (§2d) | Low — not blocking yet | Medium |

