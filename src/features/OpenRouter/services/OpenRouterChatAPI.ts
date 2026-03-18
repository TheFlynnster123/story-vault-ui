import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { OpenRouterError, parseOpenRouterError } from "./OpenRouterError";

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
        const errorBody = await response.text();
        throw this.buildApiError(response.status, errorBody);
      }

      return await response.json();
    } catch (e: any) {
      if (e instanceof OpenRouterError) {
        d.ErrorService().log(e.message, e);
        throw e;
      }

      d.ErrorService().log("Network error — please check your connection", e);
      throw new OpenRouterError(0, e?.message || "Unknown network error");
    }
  }

  private buildApiError(httpStatus: number, body: string): OpenRouterError {
    const parsed = parseOpenRouterError(httpStatus, body);
    if (parsed) return parsed;

    // Backend didn't return the expected OpenRouter shape — fall back to a
    // generic error that still carries the status code.
    return new OpenRouterError(
      httpStatus,
      body || `Request failed with status ${httpStatus}`,
    );
  }
}
