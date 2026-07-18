import type { User } from "@auth0/auth0-react";

// Global Auth0 context reference - will be set by the hook
let globalAuth0Context: any = null;
let authRecoveryPromise: Promise<void> | null = null;

export const setAuth0Context = (context: any) => {
  globalAuth0Context = context;
};

import { createGlobalInstanceCache } from "../Utils/getOrCreateInstance";

export const getAuthApiSingleton = createGlobalInstanceCache(
  () => new AuthAPI(),
);

export interface AuthAPI {
  // User info
  getUser(): Promise<User | undefined>;
  getUserId(): Promise<string | undefined>;
  getEncryptionGuid(): Promise<string | undefined>;

  // Token management
  getAccessToken(): Promise<string>;
  getIdToken(): Promise<string | undefined>;

  // Auth state
  isAuthenticated(): boolean;
  isLoading(): boolean;

  // Auth actions
  login(): Promise<void>;
  logout(): void;
}

export class AuthAPI {
  private get auth0() {
    return globalAuth0Context;
  }

  async getUser(): Promise<User | undefined> {
    return this.auth0.user;
  }

  async getUserId(): Promise<string | undefined> {
    return this.auth0.user?.sub;
  }

  async getEncryptionGuid(): Promise<string | undefined> {
    const claims = await this.auth0.getIdTokenClaims();
    return claims?.["https://story-vault-api.com/encryption_guid"];
  }

  async getAccessToken(): Promise<string> {
    try {
      return await this.auth0.getAccessTokenSilently();
    } catch (error) {
      if (!this.isInvalidRefreshTokenError(error)) throw error;

      // A rotated, expired, or revoked refresh token can remain in the SDK's
      // local-storage cache. Clear the local Auth0 session before starting a
      // fresh login so getAccessTokenSilently does not keep reusing it.
      authRecoveryPromise ??= (async () => {
        await this.auth0.logout({ openUrl: false });
        await this.auth0.loginWithRedirect({
          appState: {
            returnTo: `${window.location.pathname}${window.location.search}`,
          },
        });
      })().finally(() => {
        authRecoveryPromise = null;
      });

      await authRecoveryPromise;
      throw error;
    }
  }

  private isInvalidRefreshTokenError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const authError = error as Error & {
      error?: string;
      error_description?: string;
    };
    const details =
      `${authError.error ?? ""} ${authError.error_description ?? ""} ${authError.message}`.toLowerCase();

    return (
      details.includes("unknown or invalid refresh token") ||
      (details.includes("refresh token") &&
        (authError.error === "invalid_grant" ||
          details.includes("expired") ||
          details.includes("revoked")))
    );
  }

  async getIdToken(): Promise<string | undefined> {
    const claims = await this.auth0.getIdTokenClaims();
    return claims?.__raw;
  }

  isAuthenticated(): boolean {
    return this.auth0.isAuthenticated;
  }

  isLoading(): boolean {
    return this.auth0.isLoading;
  }

  async login(): Promise<void> {
    await this.auth0.loginWithRedirect();
  }

  logout(): void {
    this.auth0.logout({ returnTo: window.location.origin });
  }
}
