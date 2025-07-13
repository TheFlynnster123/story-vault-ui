import type { User } from "@auth0/auth0-react";

// Global Auth0 context reference - will be set by the hook
let globalAuth0Context: any = null;

export const setAuth0Context = (context: any) => {
  globalAuth0Context = context;
};

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
  constructor() {
    if (!globalAuth0Context) {
      throw new Error(
        "Auth0 context not initialized. Make sure to call setAuth0Context first."
      );
    }
  }

  private get auth0() {
    if (!globalAuth0Context) {
      throw new Error("Auth0 context not available");
    }
    return globalAuth0Context;
  }

  async getUser(): Promise<User | undefined> {
    return this.auth0.user;
  }

  async getUserId(): Promise<string | undefined> {
    return this.auth0.user?.sub;
  }

  async getEncryptionGuid(): Promise<string | undefined> {
    console.log("Getting encryption guid!");
    const claims = await this.auth0.getIdTokenClaims();
    console.log(`Claims : `);
    console.log(claims);
    return claims?.["https://story-vault-api.com/encryption_guid"];
  }

  async getAccessToken(): Promise<string> {
    return await this.auth0.getAccessTokenSilently();
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
