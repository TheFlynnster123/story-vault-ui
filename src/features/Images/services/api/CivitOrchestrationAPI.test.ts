import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CivitOrchestrationAPI,
  normalizeImageGenInputForSubmission,
  normalizeImageGenStepForSubmission,
} from "./CivitOrchestrationAPI";
import type { ImageGenInput, ImageGenStep } from "./ImageGenInput";
import { d } from "../../../../services/Dependencies";

vi.mock("../../../../services/Dependencies");

const imageGenInput = (): ImageGenInput => ({
  engine: "sdcpp",
  ecosystem: "sdxl",
  operation: "createImage",
  model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
  prompt: "masterpiece",
  width: 1024,
  height: 1024,
  loras: {},
});

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
      diffuserModel: "urn:air:anima:checkpoint:civitai:2458426@2945208",
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

    expect(result.sampleMethod).toBe("euler");
    expect(result.schedule).toBe("simple");
  });

  it("submits Z-Image Turbo through its stable built-in selector", () => {
    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem: "zImage",
      operation: "createImage",
      model: "turbo",
      prompt: "a cozy cabin",
      width: 1280,
      height: 1920,
      loras: {
        "urn:air:zimageturbo:lora:civitai:2234266@2515203": 1.5,
      },
    };

    expect(normalizeImageGenInputForSubmission(input)).toEqual({
      ...input,
      cfgScale: 1,
      steps: 9,
      sampleMethod: "euler",
      schedule: "simple",
    });
  });

  it("migrates a pinned Z-Image Base AIR to the built-in base selector", () => {
    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem: "sdxl",
      operation: "createImage",
      model: "urn:air:zimagebase:checkpoint:civitai:2342797@2635223",
      prompt: "a detailed portrait",
      width: 1024,
      height: 1536,
    };

    const result = normalizeImageGenInputForSubmission(input);

    expect(result.ecosystem).toBe("zImage");
    expect(result.model).toBe("base");
    expect(result.cfgScale).toBe(4);
    expect(result.steps).toBe(20);
  });

  it("submits only fields accepted by the hosted Krea 2 recipe", () => {
    const input: ImageGenInput = {
      engine: "fal",
      ecosystem: "krea2",
      operation: "createImage",
      model: "krea2",
      prompt: "a cinematic portrait",
      negativePrompt: "blurry",
      width: 1080,
      height: 1920,
      steps: 20,
      cfgScale: 7,
      loras: {
        "urn:air:krea2:lora:civitai:2268008@3084537": 1.5,
      },
      size: "medium",
      aspectRatio: "9:16",
      creativity: "medium",
    };

    expect(normalizeImageGenInputForSubmission(input)).toEqual({
      engine: "fal",
      operation: "createImage",
      model: "krea2",
      prompt: "a cinematic portrait",
      size: "medium",
      aspectRatio: "9:16",
      creativity: "medium",
    });
  });
});

describe("normalizeImageGenStepForSubmission", () => {
  it("preserves workflow step priority on the step", () => {
    const input = imageGenInput();

    expect(
      normalizeImageGenStepForSubmission({
        $type: "imageGen",
        priority: "high",
        input,
      }),
    ).toEqual({
      $type: "imageGen",
      priority: "high",
      input,
    });
  });
});

describe("CivitOrchestrationAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(d.AuthAPI).mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue("access-token"),
    } as unknown as ReturnType<typeof d.AuthAPI>);
    vi.mocked(d.EncryptionManager).mockReturnValue({
      getCivitaiEncryptionKey: vi.fn().mockResolvedValue("encryption-key"),
    } as unknown as ReturnType<typeof d.EncryptionManager>);
  });

  it("submits without holding the request open", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: "workflow-1", status: "scheduled", steps: [] }),
        { status: 200 },
      ),
    );
    const api = new CivitOrchestrationAPI();
    Object.assign(api, { url: "https://story-vault.example.com" });
    const step: ImageGenStep = {
      $type: "imageGen",
      priority: "low",
      input: imageGenInput(),
    };

    await api.submitWorkflow([step]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://story-vault.example.com/api/SubmitWorkflow",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
