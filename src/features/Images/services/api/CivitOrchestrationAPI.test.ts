import { describe, expect, it } from "vitest";
import { normalizeImageGenInputForSubmission } from "./CivitOrchestrationAPI";
import type { ImageGenInput } from "./ImageGenInput";

describe("normalizeImageGenInputForSubmission", () => {
  it("converts Anima AIR inputs to Anima orchestration inputs", () => {
    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem: "sdxl",
      operation: "createImage",
      model: "urn:air:anima:checkpoint:civitai:2458426@2945208",
      prompt: "masterpiece, best quality",
      negativePrompt: "low quality",
      sampleMethod: "euler_a",
      schedule: "discrete",
      steps: 40,
      cfgScale: 5,
      width: 1024,
      height: 1024,
      clipSkip: 2,
      loras: {
        "urn:air:anima:lora:civitai:199258@2964979": 1,
      },
    };

    const result = normalizeImageGenInputForSubmission(input);

    expect(result).toEqual({
      engine: "sdcpp",
      ecosystem: "anima",
      operation: "createImage",
      prompt: "masterpiece, best quality",
      negativePrompt: "low quality",
      sampleMethod: "euler_a",
      schedule: "discrete",
      steps: 40,
      cfgScale: 5,
      width: 1024,
      height: 1024,
      loras: {
        "urn:air:anima:lora:civitai:199258@2964979": 1,
      },
    });
    expect(result.model).toBeUndefined();
    expect(result.clipSkip).toBeUndefined();
  });

  it("applies Anima defaults when sampler fields are absent", () => {
    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem: "anima",
      operation: "createImage",
      prompt: "masterpiece, best quality",
      width: 1024,
      height: 1024,
      loras: {},
    };

    const result = normalizeImageGenInputForSubmission(input);

    expect(result.sampleMethod).toBe("er_sde");
    expect(result.schedule).toBe("simple");
  });
});
