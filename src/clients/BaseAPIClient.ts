import config from "../Config";
import type { EncryptionManager } from "../Managers/EncryptionManager";

export abstract class BaseAPIClient {
  protected encryptionManager: EncryptionManager;
  protected accessToken: string;
  protected baseUrl: string;

  constructor(
    encryptionManager: EncryptionManager,
    accessToken: string,
    baseUrl?: string
  ) {
    this.encryptionManager = encryptionManager;
    this.accessToken = accessToken;
    this.baseUrl = baseUrl ?? config.storyVaultAPIURL;
  }

  protected buildHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw this.createResponseError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw this.createFetchError(error);
    }
  }

  protected createResponseError(response: Response): Error {
    return new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  protected createFetchError(error: any): Error {
    return new Error(`Network error: ${error?.message || "Unknown error"}`);
  }
}
