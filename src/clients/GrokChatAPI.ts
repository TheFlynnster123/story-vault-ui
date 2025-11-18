import { d } from "../app/Dependencies/Dependencies";
import config from "../Config";
import { EncryptionManager } from "../Managers/EncryptionManager";
import type { Message } from "../models/ChatMessages/Messages";
import { AuthAPI } from "./AuthAPI";

interface PostChatRequest {
  messages: Message[];
  model?: string;
}

export class GrokChatAPI {
  authAPI: AuthAPI;
  encryptionManager: EncryptionManager;

  API_URL: string;

  constructor() {
    this.API_URL = config.storyVaultAPIURL;

    this.authAPI = new AuthAPI();
    this.encryptionManager = new EncryptionManager();
  }

  public async postChat(messages: Message[]): Promise<string> {
    await this.encryptionManager.ensureKeysInitialized();

    const headers: Record<string, string> = {
      EncryptionKey: this.encryptionManager.grokEncryptionKey as string,
    };

    const systemSettings = await d.SystemSettingsService().get();

    const requestBody: PostChatRequest = {
      messages: messages,
      ...systemSettings?.chatGenerationSettings,
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
    } catch (e: any) {
      console.error("Fetch error:", e);
      if (e.message.includes("429")) {
        d.ErrorService().log(
          "Grok rate limit exceeded - check that you have credits!",
          e
        );
        throw e;
      }
      d.ErrorService().log("Failed to make API request", e);
      throw this.createFetchError(e);
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
