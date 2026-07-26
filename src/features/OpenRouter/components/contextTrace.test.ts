import { describe, expect, it } from "vitest";
import type { TrackedContextTrace } from "../services/RequestTracker";
import { summarizeContextTrace } from "./contextTrace";

describe("summarizeContextTrace", () => {
  it("counts included, excluded, and buffered projection entries independently", () => {
    const trace: TrackedContextTrace = {
      projection: [
        {
          id: "story",
          type: "story",
          included: true,
          buffered: false,
        },
        {
          id: "recent-message",
          type: "message",
          included: true,
          buffered: true,
        },
        {
          id: "expired-note",
          type: "note",
          included: false,
          buffered: false,
          exclusionReason: "expired-note",
        },
      ],
      sections: [],
      appendedSources: [],
    };

    expect(summarizeContextTrace(trace)).toEqual({
      includedCount: 2,
      excludedCount: 1,
      bufferedCount: 1,
    });
  });

  it("returns zero counts for an empty projection", () => {
    expect(
      summarizeContextTrace({
        projection: [],
        sections: [],
        appendedSources: [],
      }),
    ).toEqual({
      includedCount: 0,
      excludedCount: 0,
      bufferedCount: 0,
    });
  });
});
