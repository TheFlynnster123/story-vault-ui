import { createGlobalInstanceCache } from "../../../services/Utils/getOrCreateInstance";

export type RequestType = "chat" | "image-prompt" | "agent-intent";

export interface TrackedMessage {
  role: string;
  content: string;
}

export interface TrackedRequest {
  id: string;
  label: string;
  type: RequestType;
  status: "success" | "error";
  /** Resolved model string, e.g. "openai/gpt-4o", or undefined if using provider default */
  model: string | undefined;
  timestamp: Date;
  durationMs?: number;
  timeToFirstTokenMs?: number;
  inputMessageCount: number;
  inputCharCount: number;
  responseCharCount: number;
  inputMessages: TrackedMessage[];
  responseContent: string;
  requestSettings?: Record<string, unknown>;
  httpStatus?: number;
  errorMessage?: string;
  /** Exact billed cost in USD as reported by OpenRouter. Undefined when not available. */
  actualCost?: number;
  /** Actual prompt token count from OpenRouter's native tokenizer. */
  promptTokens?: number;
  /** Actual completion token count (visible output only, excludes reasoning). */
  completionTokens?: number;
  /** Internal reasoning tokens consumed (e.g. o1, gpt-5). Separate from completionTokens. */
  reasoningTokens?: number;
}

export const DEFAULT_TRACKED_REQUEST_LIMIT = 20;
export const MIN_TRACKED_REQUEST_LIMIT = 1;
export const MAX_TRACKED_REQUEST_LIMIT = 200;

export const normalizeTrackedRequestLimit = (limit: unknown): number => {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_TRACKED_REQUEST_LIMIT;
  }

  return Math.min(
    MAX_TRACKED_REQUEST_LIMIT,
    Math.max(MIN_TRACKED_REQUEST_LIMIT, Math.round(limit)),
  );
};

export class RequestTracker {
  private requests: TrackedRequest[] = [];
  private listeners: Array<() => void> = [];
  private requestLimit = DEFAULT_TRACKED_REQUEST_LIMIT;

  record(request: Omit<TrackedRequest, "id">): void {
    const entry: TrackedRequest = { id: crypto.randomUUID(), ...request };
    this.requests = [entry, ...this.requests].slice(0, this.requestLimit);
    this.notifyListeners();
  }

  getRequests(): TrackedRequest[] {
    return this.requests;
  }

  setRequestLimit(limit: number): void {
    const normalized = normalizeTrackedRequestLimit(limit);
    if (normalized === this.requestLimit) return;

    this.requestLimit = normalized;
    this.requests = this.requests.slice(0, this.requestLimit);
    this.notifyListeners();
  }

  getRequestLimit(): number {
    return this.requestLimit;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}

export const getRequestTrackerInstance = createGlobalInstanceCache(
  () => new RequestTracker(),
);
