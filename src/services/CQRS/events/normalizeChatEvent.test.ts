import { describe, expect, it } from "vitest";
import { normalizeChatEvent } from "./normalizeChatEvent";

describe("normalizeChatEvent", () => {
  it("converts a legacy job creation into a workflow creation", () => {
    expect(
      normalizeChatEvent({
        type: "CivitJobCreated",
        jobId: "job-1",
        prompt: "A moonlit harbor",
        generationStatus: "submitted",
        costAmount: 0.25,
      }),
    ).toEqual({
      type: "CivitWorkflowCreated",
      messageId: "job-1",
      workflowId: "job-1",
      prompt: "A moonlit harbor",
      generationStatus: "submitted",
      costAmount: 0.25,
    });
  });

  it("renames a legacy jobId patch without losing other fields", () => {
    expect(
      normalizeChatEvent({
        type: "CivitJobUpdated",
        messageId: "pending-1",
        patch: {
          jobId: "workflow-1",
          generationStatus: "submitted",
          sceneDescription: "Moonlight on the water",
        },
      }),
    ).toEqual({
      type: "CivitWorkflowUpdated",
      messageId: "pending-1",
      patch: {
        workflowId: "workflow-1",
        generationStatus: "submitted",
        sceneDescription: "Moonlight on the water",
      },
    });
  });

  it("returns current events unchanged", () => {
    const event = {
      type: "CivitWorkflowCreated" as const,
      messageId: "message-1",
      workflowId: "workflow-1",
      prompt: "prompt",
    };

    expect(normalizeChatEvent(event)).toBe(event);
  });
});
