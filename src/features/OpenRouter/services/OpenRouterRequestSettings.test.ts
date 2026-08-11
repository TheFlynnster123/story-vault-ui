import { describe, expect, it } from "vitest";
import {
  filterSettingsForModel,
  hasOpenRouterRequestSettings,
} from "./OpenRouterRequestSettings";

const MODEL = {
  id: "openai/gpt-4",
  name: "GPT-4",
  supported_parameters: ["temperature"],
};

describe("OpenRouterRequestSettings", () => {
  it("preserves selected providers while filtering model parameters", () => {
    expect(
      filterSettingsForModel(
        {
          temperature: 0.4,
          top_p: 0.9,
          provider: { only: ["azure", "azure", "openai"] },
        },
        MODEL,
      ),
    ).toEqual({
      temperature: 0.4,
      provider: { only: ["azure", "openai"] },
    });
  });

  it("treats provider routing as an advanced customization", () => {
    expect(
      hasOpenRouterRequestSettings({ provider: { only: ["azure"] } }),
    ).toBe(true);
  });

  it("removes an empty provider restriction", () => {
    expect(
      filterSettingsForModel({ provider: { only: [] } }, MODEL),
    ).toBeUndefined();
  });
});
