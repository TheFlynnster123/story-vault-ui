# Story Vault UI - AI Coding Agent Instructions

## Architecture Overview

**Event Sourcing with CQRS**: This app uses event sourcing for chat state management. All chat operations (messages, chapters, edits) are stored as immutable events in `ChatEventStore` (encrypted backend), then processed by projections:

- **ChatService** (`src/cqrs/ChatService.ts`): Command layer - creates events for all state changes
- **UserChatProjection** (`src/cqrs/UserChatProjection.ts`): Read model for UI display (all messages with chapters)
- **LLMChatProjection** (`src/cqrs/LLMChatProjection.ts`): Read model for LLM context (chapter summaries instead of full messages)
- **ChatEventService** (`src/cqrs/ChatEventService.ts`): Manages event loading and projection initialization

**Critical Flow**: To modify chat state, create events via `ChatService` methods → events are persisted → projections process events → UI updates via subscriptions.

## Project-Specific Conventions

### Dependency Injection Pattern

**Always use `d` from Dependencies.ts** - never import services directly or create singletons:

```typescript
import { d } from "../Dependencies";

// ✅ Correct
await d.ChatService(chatId).AddUserMessage(message);
const messages = d.UserChatProjection(chatId).GetMessages();

// ❌ Never do this
const chatService = new ChatService(chatId);
```

This enables testability and centralized dependency management. See `src/Dependencies.ts` for all available services.

### Small, Intention-Revealing Functions

Follow the existing pattern of extracting tiny helper functions (even single-liners) that express **what** you're doing:

```typescript
// ✅ Good - intention is clear
const formatMessageForStorage = (message: Message): string =>
  JSON.stringify(message) + "\n";

// ❌ Avoid - implementation details mixed into business logic
await storage.append(JSON.stringify(message) + "\n");
```

Reference: `.github/instructions/CodingPractices.md` for detailed examples.

### State Management

- **Event Sourcing State**: Via CQRS projections (chat messages, chapters)
- **React Query**: Server state (user settings, API data) - hooks in `src/queries/`
- **Zustand**: Local UI state (NOT currently used extensively, check before adding)
- **Subscriptions**: Projections use observable pattern - call `.subscribe(callback)` to react to state changes

### Styling Conventions

- **Styled Components**: Use `.styled.ts` files colocated with components
- **Mantine UI**: Primary component library (`@mantine/core`, `@mantine/hooks`)
- **Naming**: Use `$` prefix for transient props (e.g., `$type`, `$isActive`)

```typescript
// ✅ Correct pattern
const MessageItem = styled.div<{ $type: "user" | "system" }>`
  text-align: ${({ $type }) => ($type === "user" ? "right" : "left")};
`;
```

## Critical Developer Workflows

### Running the App

```bash
npm run dev              # Standard dev server
npm run start-secure     # HTTPS dev server (for Auth0 testing)
npm run debug            # Opens Chrome with debugger on port 9222
```

### Testing

```bash
npm test                      # Run all tests
npm run test:ui              # Vitest UI
npm run test-skip-performance # Skip *.Performance.test.ts files
npm run test:coverage        # Coverage report
```

Test setup includes mocked Auth0, Web APIs (ResizeObserver, matchMedia) - see `src/test-utils/setup.ts`.

**Testing Philosophy** (`.github/instructions/WritingUnitTests.md`):

- Mock only what each test needs via `Dependencies.ts`
- Use helper functions to keep tests readable
- Organize by: Validation, Authentication, Success Cases, Error Handling

### Environment Variables

**7-step process** when adding new config:

1. Add to `.env.local`
2. Add to `example.env`
3. Add to `Config.ts`
4. Update GitHub dev pipeline
5. Update GitHub prod pipeline
6. Add GitHub Secret for Dev
7. Add GitHub Secret for Prod

All configs use `VITE_*` prefix and are accessed via `import.meta.env`.

## Common Patterns

### Creating New Chat Operations

1. **Define event type** in `src/cqrs/events/ChatEvent.ts`
2. **Create event util** in `src/cqrs/events/` (e.g., `MessageCreatedEventUtil.ts`)
3. **Add command** to `ChatService.ts`
4. **Update projections** to handle new event type in both `UserChatProjection.ts` and `LLMChatProjection.ts`
5. **Write tests** following patterns in existing `*.test.ts` files

### Using React Query

Query keys use factory functions:

```typescript
// Define in hook file
export const getChatIdsQueryKey = () => ["chat-ids"];

// Use in component
const { data: chatIds } = useQuery({
  queryKey: getChatIdsQueryKey(),
  queryFn: async () => await d.ChatAPI().getChatIds(),
});
```

### Navigation

Uses React Router v6+ - `useNavigate()` for programmatic navigation:

```typescript
const navigate = useNavigate();
navigate(`/chat/${chatId}`);
```

Routes defined in `src/App.tsx` with `ProtectedRoute` wrapper for auth.

## Integration Points

- **Auth0**: Authentication via `@auth0/auth0-react` - `useAuth0()` hook, `ProtectedRoute` component
- **Backend API**: `config.storyVaultAPIURL` - all API clients in `src/clients/`
- **Encryption**: `EncryptionManager` encrypts events before storage (client-side encryption)
- **External Services**: Civitai API for image generation (`src/clients/CivitJobAPI.ts`), Grok API for chat (`src/clients/GrokChatAPI.ts`)

## Testing Specific Patterns

Event sourcing makes testing straightforward:

1. Create events using event utils
2. Process through projection
3. Assert on resulting state

Example from `ChatService.AddChapter.test.ts`:

```typescript
const chatService = new ChatService(chatId);
await chatService.AddChapter(title, summary);
const messages = getUserChatProjectionInstance(chatId)!.GetMessages();
expect(messages).toContainChapterWithTitle(title);
```

## Quick Reference

- **Add user message**: `d.ChatService(chatId).AddUserMessage(content)`
- **Get messages for UI**: `d.UserChatProjection(chatId).GetMessages()`
- **Get LLM context**: `d.LLMChatProjection(chatId).getContext()`
- **Subscribe to changes**: `projection.subscribe(() => forceUpdate({}))`
- **Generate response**: `d.ChatGenerationService(chatId).generateResponse()`
