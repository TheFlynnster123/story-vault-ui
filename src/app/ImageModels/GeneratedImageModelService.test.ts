import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratedImageModelService } from "./GeneratedImageModelService";
import type {
  GeneratedImageModel,
  GeneratedImageResource,
  GeneratedImageParams,
} from "./GeneratedImageModel";
import type { ImageModel } from "./ImageModel";
import { d } from "../Dependencies/Dependencies";

// Mock global fetch
global.fetch = vi.fn();

// Mock dependencies
const mockLog = vi.fn();

vi.mock("../Dependencies/Dependencies", () => ({
  d: {
    ErrorService: vi.fn(() => ({
      log: mockLog,
    })),
  },
}));

describe("GeneratedImageModelService", () => {
  let service: GeneratedImageModelService;
  let mockFetch: any;

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

  const createMockGeneratedImageModel = (
    resources: GeneratedImageResource[] = [createMockCheckpointResource()],
    params: GeneratedImageParams = createMockGeneratedImageParams(),
    remixId: number = 12345
  ): GeneratedImageModel => ({
    type: "image",
    remixOf: { id: remixId },
    resources,
    params,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeneratedImageModelService();
    mockFetch = global.fetch as any;
  });

  describe("API Integration", () => {
    it("should build correct API URL", () => {
      const imageId = "12345";
      const url = service.buildApiUrl(imageId);

      expect(url).toBe(
        "https://civitai.com/api/generation/data?type=image&id=12345"
      );
    });
  });

  describe("Primary Resource Selection", () => {
    it("should select CHECKPOINT as primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedData = createMockGeneratedImageModel([
        loraResource,
        checkpointResource,
      ]);

      const result = service.getPrimaryResource(generatedData);

      expect(result).toBe(checkpointResource);
      expect(result.model.type).toBe("CHECKPOINT");
    });

    it("should fallback to first resource when no CHECKPOINT", () => {
      const lora1 = createMockLoraResource();
      const lora2 = { ...createMockLoraResource(), name: "Second LoRA" };
      const generatedData = createMockGeneratedImageModel([lora1, lora2]);

      const result = service.getPrimaryResource(generatedData);

      expect(result).toBe(lora1);
      expect(result.model.type).toBe("LORA");
    });

    it("should handle empty resources array", () => {
      const generatedData = createMockGeneratedImageModel([]);

      const result = service.getPrimaryResource(generatedData);

      expect(result).toBeUndefined();
    });

    it("should generate name with primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedData = createMockGeneratedImageModel(
        [checkpointResource],
        undefined,
        98765
      );

      const result = service.generateModelName(generatedData);

      expect(result).toBe("Realistic Vision XL - 98765");
    });

    it("should generate fallback name without primary resource", () => {
      const generatedData = createMockGeneratedImageModel([], undefined, 54321);

      const result = service.generateModelName(generatedData);

      expect(result).toBe("Generated Model 54321");
    });
  });

  describe("Resources Mapping", () => {
    it("should map LORA resources to additional networks", () => {
      const lora1 = createMockLoraResource();
      const lora2 = {
        ...createMockLoraResource(),
        air: "urn:air:sdxl:lora:civitai:111111@222222",
        strength: 0.6,
      };
      const checkpointResource = createMockCheckpointResource();
      const generatedData = createMockGeneratedImageModel([
        checkpointResource,
        lora1,
        lora2,
      ]);

      const result = service.mapAdditionalNetworks(generatedData);

      expect(result).toEqual({
        "urn:air:sdxl:lora:civitai:654321@210987": { strength: 0.8 },
        "urn:air:sdxl:lora:civitai:111111@222222": { strength: 0.6 },
      });
    });

    it("should return empty object for no resources", () => {
      const generatedData = createMockGeneratedImageModel([]);

      const result = service.mapAdditionalNetworks(generatedData);

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
      const generatedData = createMockGeneratedImageModel([
        checkpointResource,
        weakLora,
        strongLora,
      ]);

      const result = service.mapAdditionalNetworks(generatedData);

      expect(result["urn:air:sdxl:lora:civitai:654321@210987"]).toEqual({
        strength: 0.2,
      });
      expect(result["different:air"]).toEqual({ strength: 1.0 });
    });
  });

  describe("Params Mapping", () => {
    it("should map all params correctly with raw scheduler value", () => {
      const params = createMockGeneratedImageParams();
      const generatedData = createMockGeneratedImageModel(
        [createMockCheckpointResource()],
        params
      );

      const result = service.mapToFromTextInput(generatedData);

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
      const generatedData = createMockGeneratedImageModel(
        [createMockCheckpointResource()],
        params
      );

      const result = service.mapToFromTextInput(generatedData);

      expect(result.params.scheduler).toBe("Euler a");
    });

    it("should map model from primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedData = createMockGeneratedImageModel([checkpointResource]);

      const result = service.mapToFromTextInput(generatedData);

      expect(result.model).toBe(
        "urn:air:sdxl:checkpoint:civitai:123456@789012"
      );
    });

    it("should handle missing primary resource", () => {
      const generatedData = createMockGeneratedImageModel([]);

      const result = service.mapToFromTextInput(generatedData);

      expect(result.model).toBe("");
    });

    it("should include additional networks in mapping", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedData = createMockGeneratedImageModel([
        checkpointResource,
        loraResource,
      ]);

      const result = service.mapToFromTextInput(generatedData);

      expect(result.additionalNetworks).toEqual({
        "urn:air:sdxl:lora:civitai:654321@210987": { strength: 0.8 },
      });
    });
  });

  describe("Complete Image Model Mapping", () => {
    it("should map complete GeneratedImageModel to ImageModel", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const params = createMockGeneratedImageParams();
      const generatedData = createMockGeneratedImageModel(
        [checkpointResource, loraResource],
        params,
        99999
      );

      const result = service.mapToImageModel(generatedData);

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

    it("should handle minimal GeneratedImageModel", () => {
      const generatedData = createMockGeneratedImageModel(
        [],
        createMockGeneratedImageParams(),
        11111
      );

      const result = service.mapToImageModel(generatedData);

      expect(result.id).toEqual(expect.any(String));
      expect(result.name).toBe("Generated Model 11111");
      expect(result.input.model).toBe("");
      expect(result.input.additionalNetworks).toEqual({});
    });
  });

  describe("End-to-End GenerateImage", () => {
    it("should complete full image generation flow", async () => {
      const mockGeneratedData = createMockGeneratedImageModel();
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockGeneratedData),
      });

      const result = await service.GenerateImageModel("12345");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://civitai.com/api/generation/data?type=image&id=12345",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual({
        id: expect.any(String),
        name: "Realistic Vision XL - 12345",
        timestampUtcMs: expect.any(Number),
        input: expect.objectContaining({
          model: "urn:air:sdxl:checkpoint:civitai:123456@789012",
          params: expect.objectContaining({
            prompt: "beautiful landscape",
            steps: 20,
          }),
        }),
      });
    });

    it("should return null and log error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await service.GenerateImageModel("12345");

      expect(result).toBeNull();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to generate image model",
        expect.any(Error)
      );
    });
  });
});
