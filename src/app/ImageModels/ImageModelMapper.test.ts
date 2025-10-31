import { describe, it, expect, beforeEach } from "vitest";
import { ImageModelMapper } from "./ImageModelMapper";
import type {
  GeneratedImage,
  GeneratedImageResource,
  GeneratedImageParams,
} from "./GeneratedImage";

describe("ImageModelMapper", () => {
  let mapper: ImageModelMapper;

  const createMockGeneratedImageParams = (): GeneratedImageParams => ({
    prompt: "beautiful landscape",
    negativePrompt: "ugly, blurry",
    cfgScale: 7.5,
    steps: 20,
    sampler: "DPM++ 2M",
    width: 512,
    height: 768,
    aspectRatio: "2:3",
    clipSkip: 1,
  });

  const createMockCheckpointResource = (): GeneratedImageResource => ({
    air: "urn:air:sdxl:checkpoint:civitai:123456@789012",
    name: "Realistic Vision XL",
    strength: 1.0,
    minStrength: 0.5,
    maxStrength: 1.0,
    model: {
      name: "Realistic Vision XL",
      type: "CHECKPOINT",
    },
  });

  const createMockLoraResource = (): GeneratedImageResource => ({
    air: "urn:air:sdxl:lora:civitai:654321@210987",
    name: "Detail Enhancer",
    strength: 0.8,
    minStrength: 0.1,
    maxStrength: 1.0,
    model: {
      name: "Detail Enhancer LoRA",
      type: "LORA",
    },
  });

  const createMockGeneratedImage = (
    resources: GeneratedImageResource[] = [createMockCheckpointResource()],
    params: GeneratedImageParams = createMockGeneratedImageParams(),
    remixId: number = 12345
  ): GeneratedImage => ({
    type: "image",
    remixOf: { id: remixId },
    resources,
    params,
  });

  beforeEach(() => {
    mapper = new ImageModelMapper();
  });

  describe("Primary Resource Selection", () => {
    it("should select CHECKPOINT as primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        loraResource,
        checkpointResource,
      ]);

      const result = mapper.getPrimaryResource(generatedImage);

      expect(result).toBe(checkpointResource);
      expect(result.model.type).toBe("CHECKPOINT");
    });

    it("should fallback to first resource when no CHECKPOINT", () => {
      const lora1 = createMockLoraResource();
      const lora2 = { ...createMockLoraResource(), name: "Second LoRA" };
      const generatedImage = createMockGeneratedImage([lora1, lora2]);

      const result = mapper.getPrimaryResource(generatedImage);

      expect(result).toBe(lora1);
      expect(result.model.type).toBe("LORA");
    });

    it("should handle empty resources array", () => {
      const generatedImage = createMockGeneratedImage([]);

      const result = mapper.getPrimaryResource(generatedImage);

      expect(result).toBeUndefined();
    });
  });

  describe("Model Name Generation", () => {
    it("should generate name with primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage(
        [checkpointResource],
        undefined,
        98765
      );

      const result = mapper.generateModelName(generatedImage);

      expect(result).toBe("Realistic Vision XL - 98765");
    });

    it("should generate fallback name without primary resource", () => {
      const generatedImage = createMockGeneratedImage([], undefined, 54321);

      const result = mapper.generateModelName(generatedImage);

      expect(result).toBe("Generated Model 54321");
    });
  });

  describe("Additional Networks Mapping", () => {
    it("should map LORA resources to additional networks", () => {
      const lora1 = createMockLoraResource();
      const lora2 = {
        ...createMockLoraResource(),
        air: "urn:air:sdxl:lora:civitai:111111@222222",
        strength: 0.6,
      };
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        lora1,
        lora2,
      ]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result).toEqual({
        "urn:air:sdxl:lora:civitai:654321@210987": { strength: 0.8 },
        "urn:air:sdxl:lora:civitai:111111@222222": { strength: 0.6 },
      });
    });

    it("should return empty object for no resources", () => {
      const generatedImage = createMockGeneratedImage([]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result).toEqual({});
    });

    it("should handle resources with different strengths", () => {
      const weakLora = { ...createMockLoraResource(), strength: 0.2 };
      const strongLora = {
        ...createMockLoraResource(),
        strength: 1.0,
        air: "different:air",
      };
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        weakLora,
        strongLora,
      ]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result["urn:air:sdxl:lora:civitai:654321@210987"]).toEqual({
        strength: 0.2,
      });
      expect(result["different:air"]).toEqual({ strength: 1.0 });
    });

    it("should exclude primary resource from additional networks", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        loraResource,
      ]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result).not.toHaveProperty(
        "urn:air:sdxl:checkpoint:civitai:123456@789012"
      );
      expect(result).toHaveProperty("urn:air:sdxl:lora:civitai:654321@210987");
    });
  });

  describe("FromTextInput Mapping", () => {
    it("should map all params correctly with raw scheduler value", () => {
      const params = createMockGeneratedImageParams();
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params).toEqual({
        prompt: "beautiful landscape",
        negativePrompt: "ugly, blurry",
        scheduler: "DPM++ 2M",
        steps: 20,
        cfgScale: 7.5,
        width: 512,
        height: 768,
        clipSkip: 1,
      });
    });

    it("should handle different sampler types with raw scheduler value", () => {
      const params = {
        ...createMockGeneratedImageParams(),
        sampler: "Euler a" as any,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.scheduler).toBe("Euler a");
    });

    it("should map model from primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([checkpointResource]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.model).toBe(
        "urn:air:sdxl:checkpoint:civitai:123456@789012"
      );
    });

    it("should handle missing primary resource", () => {
      const generatedImage = createMockGeneratedImage([]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.model).toBe("");
    });

    it("should include additional networks in mapping", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        loraResource,
      ]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.additionalNetworks).toEqual({
        "urn:air:sdxl:lora:civitai:654321@210987": { strength: 0.8 },
      });
    });
  });

  describe("FromGeneratedImage", () => {
    it("should map complete GeneratedImage to ImageModel", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const params = createMockGeneratedImageParams();
      const generatedImage = createMockGeneratedImage(
        [checkpointResource, loraResource],
        params,
        99999
      );

      const result = mapper.FromGeneratedImage(generatedImage);

      expect(result).toEqual({
        id: expect.any(String),
        name: "Realistic Vision XL - 99999",
        timestampUtcMs: expect.any(Number),
        input: {
          model: "urn:air:sdxl:checkpoint:civitai:123456@789012",
          params: {
            prompt: "beautiful landscape",
            negativePrompt: "ugly, blurry",
            scheduler: "DPM++ 2M",
            steps: 20,
            cfgScale: 7.5,
            width: 512,
            height: 768,
            clipSkip: 1,
          },
          additionalNetworks: {
            "urn:air:sdxl:lora:civitai:654321@210987": { strength: 0.8 },
          },
        },
      });
    });

    it("should handle minimal GeneratedImage", () => {
      const generatedImage = createMockGeneratedImage(
        [],
        createMockGeneratedImageParams(),
        11111
      );

      const result = mapper.FromGeneratedImage(generatedImage);

      expect(result.id).toEqual(expect.any(String));
      expect(result.name).toBe("Generated Model 11111");
      expect(result.input.model).toBe("");
      expect(result.input.additionalNetworks).toEqual({});
    });
  });
});
