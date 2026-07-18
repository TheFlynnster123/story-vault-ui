import { createGlobalInstanceCache } from "../../../services/Utils/getOrCreateInstance";

class RequestInspector {
  private activeRequestId: string | null = null;
  private listeners = new Set<() => void>();

  open(requestId: string): void {
    this.activeRequestId = requestId;
    this.notify();
  }

  close(): void {
    this.activeRequestId = null;
    this.notify();
  }

  getActiveRequestId(): string | null {
    return this.activeRequestId;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const getRequestInspectorInstance = createGlobalInstanceCache(
  () => new RequestInspector(),
);
