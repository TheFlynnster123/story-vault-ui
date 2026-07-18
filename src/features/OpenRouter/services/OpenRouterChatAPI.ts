import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { SystemSettings } from "../../SystemSettings/services/SystemSettings";
import { OpenRouterError, parseOpenRouterError } from "./OpenRouterError";
import { getOpenRouterCreditsQueryKey } from "./OpenRouterCreditsAPI";
import type { RequestType, TrackedRequest } from "./RequestTracker";
import { normalizeTrackedRequestLimit } from "./RequestTracker";
import type { OpenRouterRequestSettings } from "./OpenRouterRequestSettings";
import { OPENROUTER_ADVANCED_PARAMETER_KEYS } from "./OpenRouterRequestSettings";

interface CleanMessage {
  role: string;
  content: string;
}

interface UsageResponse {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number | null;
  cost: number | null;
}

interface PostChatRequest extends OpenRouterRequestSettings {
  messages: CleanMessage[];
  model?: string;
  response_format?: OpenRouterResponseFormat;
  provider?: {
    require_parameters?: boolean;
  };
  plugins?: Array<{ id: string; [key: string]: unknown }>;
}

interface OpenRouterResponseFormat {
  type: "json_schema" | "json_object";
  json_schema?: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
}

export class OpenRouterChatAPI {
  API_URL: string;

  constructor() {
    this.API_URL = Config.storyVaultAPIURL;
  }

  public async postChat(
    messages: LLMMessage[],
    modelOverride?: string,
    requestType: RequestType = "chat",
    requestLabel: string = "LLM",
    requestSettingsOverride?: OpenRouterRequestSettings,
  ): Promise<string> {
    const startedAt = nowMs();
    const openRouterEncryptionKey = await d
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

    applyModelOverride(requestBody, modelOverride, requestSettingsOverride);
    this.applyMonitoringSettings(systemSettings);

    try {
      const response = await this.makeRequest<{
        reply: string;
        usage: UsageResponse | null;
      }>(`/api/PostChat`, {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers,
      });

      d.RequestTracker().record({
        ...buildTrackedBase(
          messages,
          requestBody,
          requestLabel,
          requestType,
          startedAt,
        ),
        status: "success",
        responseCharCount: response.reply.length,
        responseContent: response.reply,
        actualCost: response.usage?.cost ?? undefined,
        promptTokens: response.usage?.promptTokens ?? undefined,
        completionTokens: response.usage?.completionTokens ?? undefined,
        reasoningTokens: response.usage?.reasoningTokens ?? undefined,
      });

      return response.reply;
    } catch (error) {
      d.RequestTracker().record({
        ...buildTrackedBase(
          messages,
          requestBody,
          requestLabel,
          requestType,
          startedAt,
        ),
        ...buildTrackedFailure(error),
      });
      throw error;
    }
  }

  public async postStructuredChat<T>(
    messages: LLMMessage[],
    responseFormat: OpenRouterResponseFormat,
    modelOverride?: string,
    requestLabel: string = "Agent Intent",
    allowPlainTextFallback: boolean = false,
    requestSettingsOverride?: OpenRouterRequestSettings,
    requestType: RequestType = "agent-intent",
  ): Promise<T> {
    const startedAt = nowMs();
    const openRouterEncryptionKey = await d
      .EncryptionManager()
      .getOpenRouterEncryptionKey();

    const headers: Record<string, string> = {
      EncryptionKey: openRouterEncryptionKey,
    };

    const systemSettings = await d.SystemSettingsService().Get();

    const requestBody: PostChatRequest = {
      messages: cleanMessages(messages),
      ...systemSettings?.chatGenerationSettings,
      response_format: responseFormat,
      provider: {
        require_parameters: true,
      },
      plugins: [{ id: "response-healing" }],
    };

    applyModelOverride(requestBody, modelOverride, requestSettingsOverride);
    this.applyMonitoringSettings(systemSettings);

    try {
      const response = await this.makeRequest<{
        reply: string;
        usage: UsageResponse | null;
      }>(`/api/PostChat`, {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers,
      });
      const parsedReply = parseStructuredReply<T>(
        response.reply,
        allowPlainTextFallback,
      );

      d.RequestTracker().record({
        ...buildTrackedBase(
          messages,
          requestBody,
          requestLabel,
          requestType,
          startedAt,
        ),
        status: "success",
        responseCharCount: response.reply.length,
        responseContent: response.reply,
        actualCost: response.usage?.cost ?? undefined,
        promptTokens: response.usage?.promptTokens ?? undefined,
        completionTokens: response.usage?.completionTokens ?? undefined,
        reasoningTokens: response.usage?.reasoningTokens ?? undefined,
      });

      return parsedReply;
    } catch (error) {
      d.RequestTracker().record({
        ...buildTrackedBase(
          messages,
          requestBody,
          requestLabel,
          requestType,
          startedAt,
        ),
        ...buildTrackedFailure(error),
      });
      throw error;
    }
  }

  public async postChatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    modelOverride?: string,
    requestSettingsOverride?: OpenRouterRequestSettings,
  ): Promise<string> {
    const startedAt = nowMs();
    let timeToFirstTokenMs: number | undefined;
    const openRouterEncryptionKey = await d
      .EncryptionManager()
      .getOpenRouterEncryptionKey();

    const systemSettings = await d.SystemSettingsService().Get();

    const requestBody: PostChatRequest = {
      messages: cleanMessages(messages),
      ...systemSettings?.chatGenerationSettings,
    };

    applyModelOverride(requestBody, modelOverride, requestSettingsOverride);
    this.applyMonitoringSettings(systemSettings);

    const url = `${this.API_URL}/api/PostChatStream`;
    const accessToken = await d.AuthAPI().getAccessToken();

    let response: Response;
    try {
      response = await fetch(url, {
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
        const error = this.buildApiError(response.status, errorBody);
        d.ErrorService().log(error.message, error);
        throw error;
      }
    } catch (error) {
      d.RequestTracker().record({
        ...buildTrackedBase(messages, requestBody, "Chat", "chat", startedAt),
        ...buildTrackedFailure(error),
      });
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const error = new OpenRouterError(0, "Response body is not readable");
      d.RequestTracker().record({
        ...buildTrackedBase(messages, requestBody, "Chat", "chat", startedAt),
        ...buildTrackedFailure(error),
      });
      throw error;
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";
    let capturedUsage: UsageResponse | null = null;

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
              timeToFirstTokenMs ??= elapsedMs(startedAt);
              fullContent += parsed;
              onToken(fullContent);
            } else if (parsed.type === "usage") {
              capturedUsage = parsed.data as UsageResponse;
            } else if (parsed.error) {
              const code = typeof parsed.code === "number" ? parsed.code : 0;
              const error = new OpenRouterError(code, parsed.error);
              d.ErrorService().log(error.message, error);
              throw error;
            }
          } catch (e) {
            if (e instanceof OpenRouterError) throw e;
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      d.RequestTracker().record({
        ...buildTrackedBase(messages, requestBody, "Chat", "chat", startedAt),
        timeToFirstTokenMs,
        ...buildTrackedFailure(error),
      });
      throw error;
    } finally {
      reader.releaseLock();
    }

    await this.refreshCredits();

    d.RequestTracker().record({
      ...buildTrackedBase(messages, requestBody, "Chat", "chat", startedAt),
      status: "success",
      timeToFirstTokenMs,
      responseCharCount: fullContent.length,
      responseContent: fullContent,
      actualCost: capturedUsage?.cost ?? undefined,
      promptTokens: capturedUsage?.promptTokens ?? undefined,
      completionTokens: capturedUsage?.completionTokens ?? undefined,
      reasoningTokens: capturedUsage?.reasoningTokens ?? undefined,
    });

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

      const json = await response.json();
      await this.refreshCredits();
      return json;
    } catch (e: unknown) {
      if (e instanceof OpenRouterError) {
        d.ErrorService().log(e.message, e);
        throw e;
      }

      d.ErrorService().log("Network error — please check your connection", e);
      throw new OpenRouterError(
        0,
        e instanceof Error ? e.message : "Unknown network error",
      );
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
      undefined,
      body,
    );
  }

  private async refreshCredits(): Promise<void> {
    await d.QueryClient().invalidateQueries({
      queryKey: getOpenRouterCreditsQueryKey(),
    });
  }

  private applyMonitoringSettings(systemSettings: SystemSettings | undefined): void {
    d.RequestTracker().setRequestLimit(
      normalizeTrackedRequestLimit(
        systemSettings?.openRouterMonitoringSettings?.trackedRequestLimit,
      ),
    );
  }
}

export const cleanMessages = (messages: LLMMessage[]): CleanMessage[] =>
  messages.map(({ role, content }) => ({ role, content }));

const sumMessageChars = (messages: LLMMessage[]): number =>
  messages.reduce((sum, m) => sum + m.content.length, 0);

const nowMs = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const elapsedMs = (startedAt: number): number => Math.max(0, nowMs() - startedAt);

const buildTrackedBase = (
  messages: LLMMessage[],
  requestBody: PostChatRequest,
  label: string,
  type: RequestType,
  startedAt: number,
): Omit<
  TrackedRequest,
  | "id"
  | "status"
  | "responseCharCount"
  | "responseContent"
  | "actualCost"
  | "promptTokens"
  | "completionTokens"
  | "reasoningTokens"
  | "httpStatus"
  | "errorMessage"
  | "timeToFirstTokenMs"
> => ({
  label,
  type,
  model: requestBody.model,
  timestamp: new Date(),
  durationMs: elapsedMs(startedAt),
  inputMessageCount: messages.length,
  inputCharCount: sumMessageChars(messages),
  inputMessages: cleanMessages(messages),
  requestSettings: summarizeRequestSettings(requestBody),
});

const buildTrackedFailure = (
  error: unknown,
): Pick<
  TrackedRequest,
  "status" | "responseCharCount" | "responseContent" | "httpStatus" | "errorMessage"
> => ({
  status: "error",
  responseCharCount: 0,
  responseContent:
    error instanceof OpenRouterError ? error.responseBody ?? error.apiMessage : "",
  httpStatus: error instanceof OpenRouterError ? error.code : undefined,
  errorMessage: error instanceof Error ? error.message : String(error),
});

const summarizeRequestSettings = (
  requestBody: PostChatRequest,
): Record<string, unknown> => {
  const settings: Record<string, unknown> = { ...requestBody };
  delete settings.messages;
  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => value !== undefined),
  );
};

const applyModelOverride = (
  requestBody: PostChatRequest,
  modelOverride: string | undefined,
  requestSettingsOverride: OpenRouterRequestSettings | undefined,
): void => {
  if (!modelOverride) return;

  requestBody.model = modelOverride;

  for (const key of OPENROUTER_ADVANCED_PARAMETER_KEYS) {
    delete requestBody[key];
  }

  Object.assign(requestBody, requestSettingsOverride);
};

const parseStructuredReply = <T>(
  reply: string,
  allowPlainTextFallback: boolean,
): T => {
  const cleanedReply = stripJsonCodeFence(reply);
  try {
    return JSON.parse(cleanedReply) as T;
  } catch (error) {
    if (allowPlainTextFallback) {
      return cleanedReply as T;
    }

    throw new OpenRouterError(
      0,
      `Structured response was not valid JSON: ${
        error instanceof Error ? error.message : "Unknown parse error"
      }`,
    );
  }
};

const stripJsonCodeFence = (reply: string): string => {
  const trimmed = reply.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
};
