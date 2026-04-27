# OpenRouter Credits Feature

## Overview

The Credits feature displays the current OpenRouter account balance in the chat Flow panel, allowing users to monitor their API usage and credits in real-time.

## Components

### `CreditsSection`

A Flow panel component that displays the current OpenRouter credits balance. Features:

- **Real-time balance display** — Shows current balance in USD with 2 decimal places
- **Color-coded indicators** — Visual feedback based on balance level:
  - 🟡 Gold: balance ≥ $5 (healthy)
  - 🟠 Yellow: $1 ≤ balance < $5 (low)
  - 🔴 Red: balance < $1 (critical)
- **Manual refresh** — Refresh button to update balance on demand
- **Error handling** — Clear error messages when balance cannot be fetched
- **Loading states** — Shows loading indicator during fetch

Located in the Flow accordion between "Chat Model" and "Chat Image Models".

## Services

### `OpenRouterCreditsAPI`

HTTP client for fetching OpenRouter credits information from the backend.

**Method:**
- `getCredits(): Promise<OpenRouterCredits>` — Fetches current credits info

**Request:**
- Endpoint: `/api/openrouter/auth/key`
- Method: GET
- Headers:
  - `Authorization: Bearer {accessToken}`

**Response:**
```typescript
interface OpenRouterCredits {
  balance: number;        // Current balance in USD
  usage: number;          // Total usage in USD
  limit: number | null;   // Credit limit if set
  isFreeTier: boolean;    // Whether on free tier
  label?: string;         // API key label/name
}
```

## Hooks

### `useOpenRouterCredits`

React Query hook for managing credits data with automatic caching and refresh.

**Configuration:**
- `staleTime: 30000` (30 seconds) — Balance is considered fresh for 30s
- `gcTime: 60000` (1 minute) — Data kept in cache for 1 minute
- `retry: 2` — Retries failed requests twice

**Returns:**
```typescript
{
  credits: OpenRouterCredits | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

## Theme

Credits use a gold/yellow color scheme defined in `Theme.credits`:

```typescript
credits: {
  primary: "rgba(255, 215, 0, 1)",      // Gold
  secondary: "rgba(218, 165, 32, 1)",   // Darker gold
  warning: "rgba(255, 193, 7, 1)",      // Yellow (low balance)
  error: "rgba(244, 67, 54, 1)",        // Red (critical balance)
}
```

## Backend Requirements

The backend must implement a catch-all OpenRouter passthrough route at `/api/openrouter/{*route}`.

For credits, this feature calls `/api/openrouter/auth/key`, and the backend must:

1. Accept GET request with app Authorization header
2. Resolve the user from app auth, then load that user's stored OpenRouter key server-side
3. Decrypt the stored OpenRouter key using server-managed secrets/keys (never from client headers)
4. Proxy to OpenRouter `/api/v1/auth/key` using `Authorization: Bearer {decryptedOpenRouterApiKey}`
5. Return only the proxied credits metadata payload expected by the frontend

### Security Boundary

The decrypted OpenRouter API key must never be returned to the frontend.

- The frontend sends app auth only.
- The backend injects the OpenRouter bearer key when calling OpenRouter.
- Backend logs and responses must not include the raw OpenRouter key.

### OpenRouter API Reference

**Endpoint:** `GET https://openrouter.ai/api/v1/auth/key`

**Headers:**
```
Authorization: Bearer {openrouter_api_key}
```

**Response:**
```json
{
  "data": {
    "label": "My API Key",
    "usage": 5.25,
    "limit": null,
    "is_free_tier": false,
    "rate_limit": {
      "requests": 200,
      "interval": "10s"
    }
  }
}
```

Note: The balance is calculated as `limit - usage` (or infinite if limit is null).

## Usage

The Credits section is automatically displayed in the Flow panel for all chats. Users can:

1. **View current balance** — Balance is displayed and auto-refreshed every 30 seconds
2. **Manual refresh** — Click the refresh icon to update balance immediately
3. **Visual indicators** — Color indicates balance health at a glance

No transaction history is stored client-side. All data is fetched fresh from OpenRouter's API.

## Testing

Tests are located at `src/features/Chat/components/Chat/Flow/CreditsSection.test.tsx`.

**Test coverage:**
- Loading state display
- Error state handling
- Balance display formatting
- Component rendering

Run tests with:
```bash
npx vitest run src/features/Chat/components/Chat/Flow/CreditsSection.test.tsx
```

## Future Enhancements

Potential improvements for future iterations:

- Modal with detailed usage breakdown
- Recent generation costs (via OpenRouter's `/api/v1/generation` endpoint)
- Low balance notifications
- Link to add credits on openrouter.ai
- Usage charts and analytics
