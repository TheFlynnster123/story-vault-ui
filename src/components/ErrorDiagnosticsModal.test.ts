import { describe, expect, it } from "vitest";
import type { ErrorDiagnostic } from "../services/ErrorDiagnostics";
import type { TrackedRequest } from "../features/OpenRouter/services/RequestTracker";
import { findRelatedRequests } from "./findRelatedRequests";

const diagnosticAt = (timestamp: string): ErrorDiagnostic => ({
  id: "diagnostic",
  timestamp: new Date(timestamp),
  message: "Rate limit exceeded",
  errorMessage: "Rate limit exceeded",
});

const requestAt = (
  id: string,
  timestamp: string,
  overrides: Partial<TrackedRequest> = {},
): TrackedRequest => ({
  id,
  label: "Chat",
  type: "chat",
  status: "success",
  model: "test/model",
  timestamp: new Date(timestamp),
  inputMessageCount: 1,
  inputCharCount: 5,
  responseCharCount: 2,
  inputMessages: [{ role: "user", content: "Hello" }],
  responseContent: "Hi",
  ...overrides,
});

describe("findRelatedRequests", () => {
  it("puts a matching failed request ahead of a closer successful request", () => {
    const diagnostic = diagnosticAt("2026-07-18T12:00:00.000Z");
    const successful = requestAt(
      "success",
      "2026-07-18T12:00:00.100Z",
    );
    const failed = requestAt("failed", "2026-07-18T12:00:01.000Z", {
      status: "error",
      errorMessage: "Rate limit exceeded",
    });

    expect(findRelatedRequests([successful, failed], diagnostic)).toEqual([
      failed,
      successful,
    ]);
  });

  it("excludes requests outside the correlation window", () => {
    const diagnostic = diagnosticAt("2026-07-18T12:00:00.000Z");
    const oldRequest = requestAt("old", "2026-07-18T11:59:29.000Z");

    expect(findRelatedRequests([oldRequest], diagnostic)).toEqual([]);
  });
});
