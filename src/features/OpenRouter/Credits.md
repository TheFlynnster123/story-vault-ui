# OpenRouter Credits Feature

## Overview

The Credits feature displays OpenRouter key usage metrics in the chat Flow panel. It is backed by OpenRouter's key metadata endpoint and surfaces the values that are available to a non-management key: `Usage Today`, `Limit Remaining`, `Limit Resets`, plus weekly and monthly usage summaries.

## Components

### `CreditsSection`

A Flow panel component that displays the current OpenRouter key usage summary. Features:

- **Simple title row** — Keeps the main flow item as just `Credits`
- **Primary detail line** — Shows `Spend Today` and remaining `Limit`, including the reset cadence
- **Secondary detail line** — Shows `Spent this Week` and current month totals underneath the row
- **Color-coded indicators** — Visual feedback based on balance level:
  - 🟡 Gold: balance ≥ $5 (healthy)
  - 🟠 Yellow: $1 ≤ balance < $5 (low)
  - 🔴 Red: balance < $1 (critical)
- **Automatic refresh after chat completion** — Successful OpenRouter chat responses invalidate the credits query
- **Manual refresh** — Refresh button to update credits on demand
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
  - `EncryptionKey: {clientOpenRouterEncryptionKey}`

**Response:**
```typescript
interface OpenRouterCredits {
  limitRemaining: number;  // Remaining credit on the current API key in USD
  usage: number;           // Total key usage in USD
  usageDaily: number;      // Current UTC-day usage in USD
  usageWeekly: number;     // Current UTC-week usage in USD
  usageMonthly: number;    // Current UTC-month usage in USD
  limit: number | null;    // Credit limit configured on the current key
  limitReset: string | null; // Reset cadence such as weekly
  isFreeTier: boolean;     // Whether on free tier
  label?: string;          // API key label/name
}
```

## Hooks

### `useOpenRouterCredits`

React Query hook for managing credits data with automatic caching and refresh.

**Configuration:**
- `staleTime: 30000` (30 seconds) — Balance is considered fresh for 30s
- `gcTime: 60000` (1 minute) — Data kept in cache for 1 minute
- `retry: 2` — Retries failed requests twice

Successful `OpenRouterChatAPI` completions also invalidate the credits query so the panel refreshes after chat generation without waiting for the stale timer.

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

The backend route for credits is intentionally a thin OpenRouter proxy.

For credits, this feature calls `/api/openrouter/auth/key`, and the backend must:

1. Accept a GET request with Story Vault app auth and `EncryptionKey`
2. Resolve the authenticated user and load that user's stored encrypted OpenRouter key
3. Decrypt the stored OpenRouter key with the supplied `EncryptionKey`
4. Proxy the request to OpenRouter `GET /api/v1/auth/key` using `Authorization: Bearer {decryptedOpenRouterApiKey}`
5. Return the upstream JSON payload without exposing the raw OpenRouter key

### Security Boundary

The decrypted OpenRouter API key must never be returned to the frontend.

- The frontend sends Story Vault app auth plus `EncryptionKey`.
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

Note: The UI no longer claims to show account balance. It displays only the key-level fields that OpenRouter returns for this kind of API key.

## Account Balance Constraint

The current OpenRouter response shows `is_management_key: false`, so this UI should be treated as a key-usage view, not an account-wallet view. The frontend should not infer or label any field as account balance from this payload.

## Usage

The Credits section is automatically displayed in the Flow panel for all chats. Users can:

1. **View current usage** — Daily, weekly, and monthly key usage is displayed and auto-refreshed every 30 seconds
2. **Auto-refresh after generation** — Successful streamed and non-streamed chat completions refresh the displayed credits
3. **Manual refresh** — Click the refresh icon to update credits immediately
4. **Visual indicators** — Color indicates remaining key credit at a glance

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
