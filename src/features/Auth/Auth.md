# Auth Feature

## Overview

The Auth feature handles user authentication via Auth0. It manages the login flow, route protection, and ensures users have the required API keys before accessing the application.

## Components

### `ProtectedRoute`

A wrapper component that guards routes behind authentication. It checks:

1. **Auth0 authentication** — redirects unauthenticated users to the landing page.
2. **Grok key validation** (optional, enabled by default) — ensures users have a valid Grok API key before accessing protected content.

Shows a loading state while authentication status is being determined.

## Hooks

### `useAuth0Setup`

Initializes the Auth0 context for the application by passing the Auth0 React hook context into the app's `AuthAPI` service. This bridge allows non-React service code to access authentication tokens.

## Pages

### `LandingPage`

The entry point for unauthenticated users. Handles three states:

1. **Not authenticated** — displays a login button that triggers Auth0 login.
2. **Authenticated, no Grok key** — displays the `GrokKeyInput` form.
3. **Authenticated with valid key** — redirects to the chat menu.

## Authentication Flow

1. User visits the app → `LandingPage` renders
2. User clicks "Log in" → Auth0 login redirect
3. On return, `useAuth0Setup` bridges Auth0 context to services
4. `ProtectedRoute` verifies authentication + Grok key → grants access
5. `EncryptionManager` initializes encryption keys once the Grok key is validated

## Directory Structure

```
Auth/
  components/
    ProtectedRoute.tsx
  hooks/
    useAuth0Setup.ts
  pages/
    LandingPage.tsx
```
