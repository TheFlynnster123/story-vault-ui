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
  /** Resolved model string, e.g. "openai/gpt-4o", or undefined if using provider default */
  model: string | undefined;
  timestamp: Date;
  inputMessageCount: number;
  inputCharCount: number;
  responseCharCount: number;
  inputMessages: TrackedMessage[];
  responseContent: string;
  /** Exact billed cost in USD as reported by OpenRouter. Undefined when not available. */
  actualCost?: number;
  /** Actual prompt token count from OpenRouter's native tokenizer. */
  promptTokens?: number;
  /** Actual completion token count (visible output only, excludes reasoning). */
  completionTokens?: number;
  /** Internal reasoning tokens consumed (e.g. o1, gpt-5). Separate from completionTokens. */
  reasoningTokens?: number;
}

const MAX_REQUESTS = 20;

export class RequestTracker {
  private requests: TrackedRequest[] = [];
  private listeners: Array<() => void> = [];

  record(request: Omit<TrackedRequest, "id">): void {
    const entry: TrackedRequest = { id: crypto.randomUUID(), ...request };
    this.requests = [entry, ...this.requests].slice(0, MAX_REQUESTS);
    this.notifyListeners();
  }

  getRequests(): TrackedRequest[] {
    return this.requests;
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
