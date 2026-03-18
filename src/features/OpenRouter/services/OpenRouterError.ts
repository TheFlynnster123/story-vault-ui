/**
 * Structured error from the OpenRouter API.
 *
 * OpenRouter returns errors in this shape:
 * ```json
 * { "error": { "code": 429, "message": "Rate limit exceeded", "metadata": { ... } } }
 * ```
 *
 * This class preserves the full response so the UI can display rich,
 * actionable messages instead of generic "request failed" toasts.
 */
export class OpenRouterError extends Error {
  /** HTTP-level status code (e.g. 401, 402, 429, 502). */
  readonly code: number;

  /** Raw message returned by OpenRouter / the upstream provider. */
  readonly apiMessage: string;

  /** Optional metadata (moderation reasons, provider details, etc.). */
  readonly metadata?: Record<string, unknown>;

  constructor(code: number, apiMessage: string, metadata?: Record<string, unknown>) {
    super(getUserFriendlyMessage(code, apiMessage, metadata));
    this.name = "OpenRouterError";
    this.code = code;
    this.apiMessage = apiMessage;
    this.metadata = metadata;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Try to parse the response body as an OpenRouter error.
 * Returns `undefined` when the body doesn't match the expected shape.
 */
export const parseOpenRouterError = (
  httpStatus: number,
  body: string,
): OpenRouterError | undefined => {
  try {
    const json = JSON.parse(body);
    const err = json?.error;
    if (!err) return undefined;

    const code: number = typeof err.code === "number" ? err.code : httpStatus;
    const message: string = typeof err.message === "string" ? err.message : "Unknown error";
    const metadata: Record<string, unknown> | undefined = err.metadata ?? undefined;

    return new OpenRouterError(code, message, metadata);
  } catch {
    return undefined;
  }
};

/**
 * Maps an OpenRouter error code + metadata to a short, human-readable
 * message that is shown in the UI notification.
 */
const getUserFriendlyMessage = (
  code: number,
  apiMessage: string,
  metadata?: Record<string, unknown>,
): string => {
  switch (code) {
    case 400:
      return `Bad request: ${apiMessage}`;

    case 401:
      return "Your OpenRouter API key is invalid or expired. Please update it in Settings.";

    case 402:
      return "Insufficient OpenRouter credits. Please add credits at openrouter.ai and try again.";

    case 403:
      return buildModerationMessage(apiMessage, metadata);

    case 408:
      return "The request timed out. The model may be overloaded — try again shortly.";

    case 429:
      return "Rate limit exceeded. Please wait a moment and try again, or check your OpenRouter credits.";

    case 502:
      return "The selected model is currently unavailable. Try a different model or try again later.";

    case 503:
      return "No provider is available for this model right now. Try a different model or provider.";

    default:
      return apiMessage || `Unexpected error (${code})`;
  }
};

const buildModerationMessage = (
  apiMessage: string,
  metadata?: Record<string, unknown>,
): string => {
  const reasons = Array.isArray(metadata?.reasons)
    ? (metadata.reasons as string[]).join(", ")
    : undefined;

  if (reasons) {
    return `Your input was flagged by moderation: ${reasons}`;
  }

  return `Content moderation error: ${apiMessage}`;
};
