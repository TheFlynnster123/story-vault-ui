import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

interface PostChatRequest {
  messages: LLMMessage[];
  model?: string;
}

export class OpenRouterChatAPI {
  API_URL: string;

  constructor() {
    this.API_URL = Config.storyVaultAPIURL;
  }

  public async postChat(
    messages: LLMMessage[],
    modelOverride?: string,
  ): Promise<string> {
    var openRouterEncryptionKey = await d
      .EncryptionManager()
      .getOpenRouterEncryptionKey();

    const headers: Record<string, string> = {
      EncryptionKey: openRouterEncryptionKey,
    };

    const systemSettings = await d.SystemSettingsService().Get();

    const requestBody: PostChatRequest = {
      messages: messages,
      ...systemSettings?.chatGenerationSettings,
    };

    if (modelOverride) {
      requestBody.model = modelOverride;
    }

    const response = await this.makeRequest<{ reply: string }>(
      `/api/PostChat`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers,
      },
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
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.API_URL}${endpoint}`;
    const accessToken = await d.AuthAPI().getAccessToken();

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
          "OpenRouter rate limit exceeded - check that you have credits!",
          e,
        );
        throw e;
      }
      d.ErrorService().log("Failed to make API request", e);
      throw this.createFetchError(e);
    }
  }

  createResponseError(response: Response): Error {
    return new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  createFetchError(error: any): Error {
    return new Error(`Network error: ${error?.message || "Unknown error"}`);
  }
}
