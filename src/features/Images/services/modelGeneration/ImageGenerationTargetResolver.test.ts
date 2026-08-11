import { describe, expect, it } from "vitest";
import type { GeneratedImageResource } from "./GeneratedImage";
import { resolveImageGenerationTarget } from "./ImageGenerationTargetResolver";

const resource = (
  overrides: Partial<GeneratedImageResource> = {},
): GeneratedImageResource => ({
  air: "urn:air:sdxl:checkpoint:civitai:123@456",
  name: "Example model",
  strength: 1,
  minStrength: 0,
  maxStrength: 1,
  trainedWords: [],
  canGenerate: true,
  model: { name: "Example model", type: "Checkpoint" },
  ...overrides,
});

describe("resolveImageGenerationTarget", () => {
  it("maps a Z-Image Turbo checkpoint AIR to the stable recipe selector", () => {
    const checkpoint = resource({
      air: "urn:air:zimageturbo:diffusionmodel:civitai:2168935@2442439",
      baseModel: "ZImageTurbo",
    });

    expect(
      resolveImageGenerationTarget({
        resources: [checkpoint],
        resolvedModelAir: checkpoint.air,
      }),
    ).toEqual({ ecosystem: "zImage", model: "turbo" });
  });

  it("maps Z-Image Base metadata to the base recipe selector", () => {
    const checkpoint = resource({
      air: "urn:air:zimagebase:checkpoint:civitai:2342797@2635223",
      baseModel: "ZImageBase",
    });

    expect(
      resolveImageGenerationTarget({
        resources: [checkpoint],
        resolvedModelAir: checkpoint.air,
        paramsModel: "z-image-base-bf16",
      }),
    ).toEqual({ ecosystem: "zImage", model: "base" });
  });

  it("resolves a Z-Image LoRA-only import without a checkpoint AIR", () => {
    const lora = resource({
      air: "urn:air:zimageturbo:lora:civitai:2234266@2515203",
      baseModel: "ZImageTurbo",
      model: { name: "Style", type: "LORA" },
    });

    expect(
      resolveImageGenerationTarget({ resources: [lora], resolvedModelAir: "" }),
    ).toEqual({ ecosystem: "zImage", model: "turbo" });
  });

  it("maps Krea 2 metadata to the hosted Krea recipe", () => {
    const lora = resource({
      air: "urn:air:krea2:lora:civitai:2268008@3084537",
      baseModel: "Krea 2",
      model: { name: "Snapshot", type: "LORA" },
    });

    expect(
      resolveImageGenerationTarget({
        resources: [lora],
        resolvedModelAir: "",
        paramsModel: "krea2_turbo_fp8_scaled",
      }),
    ).toEqual({ ecosystem: "krea2", model: "krea2" });
  });

  it("keeps checkpoint AIR routing for existing SDXL models", () => {
    const checkpoint = resource();

    expect(
      resolveImageGenerationTarget({
        resources: [checkpoint],
        resolvedModelAir: checkpoint.air,
      }),
    ).toEqual({ ecosystem: "sdxl", model: checkpoint.air });
  });

  it("does not silently route an unknown ecosystem through SDXL", () => {
    const checkpoint = resource({
      air: "urn:air:flux1:checkpoint:civitai:123@456",
      baseModel: "Flux.1 D",
    });

    expect(() =>
      resolveImageGenerationTarget({
        resources: [checkpoint],
        resolvedModelAir: checkpoint.air,
      }),
    ).toThrow(/does not yet have a generation adapter.*flux1/);
  });
});
