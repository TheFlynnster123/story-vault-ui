import { describe, expect, it } from "vitest";
import { Theme } from "../../../components/Theme";
import { getMessageTypePresentation } from "./messageTypePresentation";

describe("getMessageTypePresentation", () => {
  it("uses the reasoning theme for reasoning messages", () => {
    expect(getMessageTypePresentation("reasoning")).toEqual({
      label: "Reasoning",
      color: Theme.chatSettings.primary,
    });
  });

  it("infers an assistant response when only the LLM role is available", () => {
    expect(getMessageTypePresentation(undefined, "assistant")).toEqual({
      label: "Assistant response",
      color: Theme.messages.assistant.background,
    });
  });

  it("formats unknown message types into a readable fallback", () => {
    expect(getMessageTypePresentation("custom-message").label).toBe(
      "Custom Message",
    );
  });
});
