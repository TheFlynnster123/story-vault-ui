import { createGlobalInstanceCache } from "./Utils/getOrCreateInstance";

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  timestamp: Date;
  message: string;
}

export interface ErrorDiagnostic {
  id: string;
  timestamp: Date;
  message: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
}

const MAX_CONSOLE_ENTRIES = 200;
const RELATED_WINDOW_MS = 15_000;

class ErrorDiagnostics {
  private consoleEntries: ConsoleEntry[] = [];
  private diagnostics: ErrorDiagnostic[] = [];
  private activeDiagnosticId: string | null = null;
  private listeners = new Set<() => void>();
  private consoleCaptureInstalled = false;

  installConsoleCapture(): void {
    if (this.consoleCaptureInstalled) return;
    this.consoleCaptureInstalled = true;

    for (const level of ["log", "info", "warn", "error"] as const) {
      const original = console[level].bind(console);
      console[level] = (...values: unknown[]) => {
        this.captureConsoleEntry(level, values);
        original(...values);
      };
    }
  }

  record(message: string, error?: unknown): ErrorDiagnostic {
    const diagnostic: ErrorDiagnostic = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage:
        error instanceof Error
          ? error.message
          : error === undefined
            ? undefined
            : formatValue(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    this.diagnostics = [diagnostic, ...this.diagnostics].slice(0, 50);
    this.notify();
    return diagnostic;
  }

  open(id: string): void {
    this.activeDiagnosticId = id;
    this.notify();
  }

  close(): void {
    this.activeDiagnosticId = null;
    this.notify();
  }

  getActive(): ErrorDiagnostic | undefined {
    return this.diagnostics.find(({ id }) => id === this.activeDiagnosticId);
  }

  getRelatedConsoleEntries(timestamp: Date): ConsoleEntry[] {
    const target = timestamp.getTime();
    return this.consoleEntries.filter(
      (entry) => Math.abs(entry.timestamp.getTime() - target) <= RELATED_WINDOW_MS,
    );
  }

  getConsoleEntries(): ConsoleEntry[] {
    return this.consoleEntries;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private captureConsoleEntry(level: ConsoleLevel, values: unknown[]): void {
    const entry: ConsoleEntry = {
      id: crypto.randomUUID(),
      level,
      timestamp: new Date(),
      message: values.map(formatValue).join(" "),
    };
    this.consoleEntries = [...this.consoleEntries, entry].slice(
      -MAX_CONSOLE_ENTRIES,
    );
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

const formatValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const getErrorDiagnosticsInstance = createGlobalInstanceCache(
  () => new ErrorDiagnostics(),
);
