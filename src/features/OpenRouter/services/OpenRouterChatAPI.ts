import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { OpenRouterError, parseOpenRouterError } from "./OpenRouterError";

interface CleanMessage {
  role: string;
  content: string;
}

interface PostChatRequest {
  messages: CleanMessage[];
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
      messages: cleanMessages(messages),
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

  public async postChatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    modelOverride?: string,
  ): Promise<string> {
    const openRouterEncryptionKey = await d
      .EncryptionManager()
      .getOpenRouterEncryptionKey();

    const systemSettings = await d.SystemSettingsService().Get();

    const requestBody: PostChatRequest = {
      messages: cleanMessages(messages),
      ...systemSettings?.chatGenerationSettings,
    };

    if (modelOverride) {
      requestBody.model = modelOverride;
    }

    const url = `${this.API_URL}/api/PostChatStream`;
    const accessToken = await d.AuthAPI().getAccessToken();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        EncryptionKey: openRouterEncryptionKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.buildApiError(response.status, errorBody);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OpenRouterError(0, "Response body is not readable");
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (typeof parsed === "string") {
              fullContent += parsed;
              onToken(fullContent);
            } else if (parsed.error) {
              throw new OpenRouterError(0, parsed.error);
            }
          } catch (e) {
            if (e instanceof OpenRouterError) throw e;
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
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

export const cleanMessages = (messages: LLMMessage[]): CleanMessage[] =>
  messages.map(({ role, content }) => ({ role, content }));
