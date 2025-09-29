import config from "../Config";
import { EncryptionManager } from "../Managers/EncryptionManager";
import type { SystemSettings } from "../models";
import type { Message } from "../pages/Chat/ChatMessage";
import { AuthAPI } from "./AuthAPI";

interface PostChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
}

export class GrokChatAPI {
  authAPI: AuthAPI;
  encryptionManager: EncryptionManager;
  systemSettings?: SystemSettings;

  API_URL: string;

  constructor(systemSettings?: SystemSettings) {
    this.API_URL = config.storyVaultAPIURL;
    this.systemSettings = systemSettings;

    this.authAPI = new AuthAPI();
    this.encryptionManager = new EncryptionManager();
  }

  public async postChat(messages: Message[]): Promise<string> {
    await this.encryptionManager.ensureKeysInitialized();

    const headers: Record<string, string> = {
      EncryptionKey: this.encryptionManager.grokEncryptionKey as string,
    };

    const requestBody: PostChatRequest = {
      messages: messages,
      ...this.systemSettings?.chatGenerationSettings,
    };

    const response = await this.makeRequest<{ reply: string }>(
      `/api/PostChat`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers,
      }
    );

    return response.reply;
  }

  buildHeaders(accessToken: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.API_URL}${endpoint}`;
    const accessToken = await this.authAPI.getAccessToken();

    const headers = this.buildHeaders(accessToken);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API request failed:", errorText);
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

  createResponseError(response: Response): Error {
    return new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  createFetchError(error: any): Error {
    return new Error(`Network error: ${error?.message || "Unknown error"}`);
  }
}
