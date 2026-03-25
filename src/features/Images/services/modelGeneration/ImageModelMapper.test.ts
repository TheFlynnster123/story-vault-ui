import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ImageModelMapper } from "./ImageModelMapper";
import type {
  GeneratedImage,
  GeneratedImageResource,
  GeneratedImageParams,
} from "./GeneratedImage";
import { d } from "../../../../services/Dependencies";

describe("ImageModelMapper", () => {
  let mapper: ImageModelMapper;
  let BaseModelMapper: ReturnType<typeof vi.fn>;
  let SchedulerMapper: ReturnType<typeof vi.fn>;

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
    trainedWords: [],
    canGenerate: true,
    model: {
      name: "Realistic Vision XL",
      type: "Checkpoint",
    },
  });

  const createMockLoraResource = (): GeneratedImageResource => ({
    air: "urn:air:sdxl:lora:civitai:654321@210987",
    name: "Detail Enhancer",
    strength: 0.8,
    minStrength: 0.1,
    maxStrength: 1.0,
    trainedWords: [],
    canGenerate: true,
    model: {
      name: "Detail Enhancer LoRA",
      type: "LORA",
    },
  });

  const createMockGeneratedImage = (
    resources: GeneratedImageResource[] = [createMockCheckpointResource()],
    params: GeneratedImageParams = createMockGeneratedImageParams(),
    remixId: number = 12345,
  ): GeneratedImage => ({
    type: "image",
    remixOf: { id: remixId },
    resources,
    params,
  });

  beforeEach(() => {
    BaseModelMapper = vi.fn();
    SchedulerMapper = vi.fn((displayName: string) => displayName) as any;

    vi.spyOn(d, "BaseModelMapper").mockReturnValue({
      toAIR: BaseModelMapper,
    } as any);

    vi.spyOn(d, "SchedulerMapper").mockReturnValue({
      MapToSchedulerName: SchedulerMapper,
    } as any);

    mapper = new ImageModelMapper();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Primary Resource Selection", () => {
    it("should select Checkpoint as primary resource (mixed case)", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        loraResource,
        checkpointResource,
      ]);

      const result = mapper.getPrimaryResource(generatedImage);

      expect(result).toBe(checkpointResource);
    });

    it("should select CHECKPOINT as primary resource (uppercase)", () => {
      const checkpointResource = {
        ...createMockCheckpointResource(),
        model: { name: "Test", type: "CHECKPOINT" },
      };
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        loraResource,
        checkpointResource,
      ]);

      const result = mapper.getPrimaryResource(generatedImage);

      expect(result).toBe(checkpointResource);
    });

    it("should fallback to first resource when no Checkpoint", () => {
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

  describe("isCheckpoint", () => {
    it("should match 'Checkpoint' (mixed case from API)", () => {
      expect(mapper.isCheckpoint("Checkpoint")).toBe(true);
    });

    it("should match 'CHECKPOINT' (uppercase)", () => {
      expect(mapper.isCheckpoint("CHECKPOINT")).toBe(true);
    });

    it("should match 'checkpoint' (lowercase)", () => {
      expect(mapper.isCheckpoint("checkpoint")).toBe(true);
    });

    it("should not match LORA", () => {
      expect(mapper.isCheckpoint("LORA")).toBe(false);
    });
  });

  describe("Model Name Generation", () => {
    it("should generate name with primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage(
        [checkpointResource],
        undefined,
        98765,
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

    it("should exclude checkpoint from additional networks", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        loraResource,
      ]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result).not.toHaveProperty(
        "urn:air:sdxl:checkpoint:civitai:123456@789012",
      );
      expect(result).toHaveProperty("urn:air:sdxl:lora:civitai:654321@210987");
    });

    it("should exclude mixed-case Checkpoint from additional networks", () => {
      const checkpointResource = createMockCheckpointResource();
      checkpointResource.model.type = "Checkpoint";
      const loraResource = createMockLoraResource();
      const generatedImage = createMockGeneratedImage([
        checkpointResource,
        loraResource,
      ]);

      const result = mapper.mapAdditionalNetworks(generatedImage);

      expect(result).not.toHaveProperty(checkpointResource.air);
      expect(result).toHaveProperty(loraResource.air);
    });
  });

  describe("Trained Words Extraction", () => {
    it("should extract trained words from all resources", () => {
      const lora1 = {
        ...createMockLoraResource(),
        trainedWords: ["building", "tree"],
      };
      const lora2 = {
        ...createMockLoraResource(),
        air: "another:air",
        trainedWords: ["sky", "cloud"],
      };
      const checkpoint = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([
        checkpoint,
        lora1,
        lora2,
      ]);

      const result = mapper.extractAllTrainedWords(generatedImage);

      expect(result).toEqual(["building", "tree", "sky", "cloud"]);
    });

    it("should deduplicate trained words", () => {
      const lora1 = {
        ...createMockLoraResource(),
        trainedWords: ["building", "tree"],
      };
      const lora2 = {
        ...createMockLoraResource(),
        air: "another:air",
        trainedWords: ["tree", "sky"],
      };
      const generatedImage = createMockGeneratedImage([lora1, lora2]);

      const result = mapper.extractAllTrainedWords(generatedImage);

      expect(result).toEqual(["building", "tree", "sky"]);
    });

    it("should return empty array when no trained words", () => {
      const checkpoint = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([checkpoint]);

      const result = mapper.extractAllTrainedWords(generatedImage);

      expect(result).toEqual([]);
    });

    it("should handle resources with undefined trainedWords", () => {
      const resource = createMockLoraResource();
      (resource as any).trainedWords = undefined;
      const generatedImage = createMockGeneratedImage([resource]);

      const result = mapper.extractAllTrainedWords(generatedImage);

      expect(result).toEqual([]);
    });
  });

  describe("Resolve Width/Height", () => {
    it("should extract width/height from aspectRatio object", () => {
      const params: GeneratedImageParams = {
        ...createMockGeneratedImageParams(),
        aspectRatio: { value: "1248:1824", width: 1248, height: 1824 },
      };

      const result = mapper.resolveWidthHeight(params);

      expect(result).toEqual({ width: 1248, height: 1824 });
    });

    it("should fall back to top-level width/height when aspectRatio is string", () => {
      const params: GeneratedImageParams = {
        ...createMockGeneratedImageParams(),
        width: 512,
        height: 768,
        aspectRatio: "2:3",
      };

      const result = mapper.resolveWidthHeight(params);

      expect(result).toEqual({ width: 512, height: 768 });
    });

    it("should default to 512x512 when no dimensions available", () => {
      const params: GeneratedImageParams = {
        ...createMockGeneratedImageParams(),
        width: undefined,
        height: undefined,
        aspectRatio: undefined,
      };

      const result = mapper.resolveWidthHeight(params);

      expect(result).toEqual({ width: 512, height: 512 });
    });
  });

  describe("Resolve Model AIR", () => {
    it("should use substitute AIR when primary cannot generate", () => {
      const checkpointResource = {
        ...createMockCheckpointResource(),
        canGenerate: false,
        substitute: {
          air: "urn:air:sdxl:checkpoint:civitai:999999@888888",
          name: "Substitute Model",
          canGenerate: true,
          strength: 1,
        },
      };

      const result = mapper.resolveModelAir(
        checkpointResource,
        true,
        undefined,
      );

      expect(result).toBe("urn:air:sdxl:checkpoint:civitai:999999@888888");
    });

    it("should use primary AIR when it can generate", () => {
      const checkpointResource = createMockCheckpointResource();

      const result = mapper.resolveModelAir(
        checkpointResource,
        true,
        undefined,
      );

      expect(result).toBe("urn:air:sdxl:checkpoint:civitai:123456@789012");
    });

    it("should use primary AIR when substitute also cannot generate", () => {
      const checkpointResource = {
        ...createMockCheckpointResource(),
        canGenerate: false,
        substitute: {
          air: "urn:air:sdxl:checkpoint:civitai:999999@888888",
          name: "Substitute Model",
          canGenerate: false,
          strength: 1,
        },
      };

      const result = mapper.resolveModelAir(
        checkpointResource,
        true,
        undefined,
      );

      expect(result).toBe("urn:air:sdxl:checkpoint:civitai:123456@789012");
    });

    it("should use BaseModelMapper when primary is not a checkpoint", () => {
      BaseModelMapper.mockReturnValue("urn:air:mapped:base");
      const loraResource = createMockLoraResource();
      loraResource.baseModel = "Illustrious";

      const result = mapper.resolveModelAir(loraResource, false, "Illustrious");

      expect(BaseModelMapper).toHaveBeenCalledWith("Illustrious");
      expect(result).toBe("urn:air:mapped:base");
    });
  });

  describe("FromTextInput Mapping", () => {
    it("should map all params correctly with raw scheduler value", () => {
      const params = createMockGeneratedImageParams();
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
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
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.scheduler).toBe("Euler a");
    });

    it("should map scheduler display name to scheduler name", () => {
      SchedulerMapper.mockReturnValue("DPM2M");
      const params = {
        ...createMockGeneratedImageParams(),
        sampler: "DPM++ 2M" as any,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(SchedulerMapper).toHaveBeenCalledWith("DPM++ 2M");
      expect(result.params.scheduler).toBe("DPM2M");
    });

    it("should map Euler a display name to EulerA scheduler name", () => {
      SchedulerMapper.mockReturnValue("EulerA");
      const params = {
        ...createMockGeneratedImageParams(),
        sampler: "Euler a" as any,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(SchedulerMapper).toHaveBeenCalledWith("Euler a");
      expect(result.params.scheduler).toBe("EulerA");
    });

    it("should map model from primary resource", () => {
      const checkpointResource = createMockCheckpointResource();
      const generatedImage = createMockGeneratedImage([checkpointResource]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.model).toBe(
        "urn:air:sdxl:checkpoint:civitai:123456@789012",
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

    it("should use BaseModelMapper when no Checkpoint resource available", () => {
      const mockMappedBaseModelAIR = "urn:air:mock:checkpoint:test:123@456";
      BaseModelMapper.mockReturnValue(mockMappedBaseModelAIR);

      const loraResource = createMockLoraResource();
      loraResource.baseModel = "TestModel";
      const generatedImage = createMockGeneratedImage([loraResource]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(BaseModelMapper).toHaveBeenCalledWith("TestModel");
      expect(result.additionalNetworks).toEqual({
        [loraResource.air]: { strength: 0.8 },
      });
      expect(result.model).toBe(mockMappedBaseModelAIR);
    });

    it("should not use BaseModelMapper when Checkpoint resource available", () => {
      const checkpointResource = createMockCheckpointResource();
      checkpointResource.baseModel = "TestModel";
      const generatedImage = createMockGeneratedImage([checkpointResource]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(BaseModelMapper).not.toHaveBeenCalled();
      expect(result.model).toBe(
        "urn:air:sdxl:checkpoint:civitai:123456@789012",
      );
    });

    it("should use substitute AIR when checkpoint canGenerate is false", () => {
      const checkpointResource = {
        ...createMockCheckpointResource(),
        canGenerate: false,
        substitute: {
          air: "urn:air:sdxl:checkpoint:civitai:999@888",
          name: "Substitute",
          canGenerate: true,
          strength: 1,
        },
      };
      const generatedImage = createMockGeneratedImage([checkpointResource]);

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.model).toBe("urn:air:sdxl:checkpoint:civitai:999@888");
    });

    it("should extract width/height from aspectRatio object", () => {
      const params: GeneratedImageParams = {
        ...createMockGeneratedImageParams(),
        aspectRatio: { value: "1248:1824", width: 1248, height: 1824 },
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.width).toBe(1024);
      expect(result.params.height).toBe(1024);
    });

    it("should truncate width to 1024 when over limit", () => {
      const params = createMockGeneratedImageParams();
      params.width = 2048;
      params.height = 768;

      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.width).toBe(1024);
      expect(result.params.height).toBe(768);
    });

    it("should truncate height to 1024 when over limit", () => {
      const params = createMockGeneratedImageParams();
      params.width = 512;
      params.height = 2048;

      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.width).toBe(512);
      expect(result.params.height).toBe(1024);
    });

    it("should truncate both width and height when both over limit", () => {
      const params = createMockGeneratedImageParams();
      params.width = 2560;
      params.height = 1920;

      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.width).toBe(1024);
      expect(result.params.height).toBe(1024);
    });

    it("should not modify dimensions when under 1024 limit", () => {
      const params = {
        ...createMockGeneratedImageParams(),
        width: 1024,
        height: 1024,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.width).toBe(1024);
      expect(result.params.height).toBe(1024);
    });

    it("should default clipSkip to 2 when not available", () => {
      const params = {
        ...createMockGeneratedImageParams(),
        clipSkip: undefined as any,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      const result = mapper.mapToFromTextInput(generatedImage);

      expect(result.params.clipSkip).toBe(2);
    });

    it("should default to Euler a when sampler is undefined", () => {
      const params = {
        ...createMockGeneratedImageParams(),
        sampler: undefined,
      };
      const generatedImage = createMockGeneratedImage(
        [createMockCheckpointResource()],
        params,
      );

      mapper.mapToFromTextInput(generatedImage);

      expect(SchedulerMapper).toHaveBeenCalledWith("Euler a");
    });
  });

  describe("FromGeneratedImage", () => {
    it("should map complete GeneratedImage to ImageModel with trainedWords", () => {
      const checkpointResource = createMockCheckpointResource();
      const loraResource = {
        ...createMockLoraResource(),
        trainedWords: ["building", "tree"],
      };
      const params = createMockGeneratedImageParams();
      const generatedImage = createMockGeneratedImage(
        [checkpointResource, loraResource],
        params,
        99999,
      );

      const result = mapper.FromGeneratedImage(generatedImage);

      expect(result).toEqual({
        id: expect.any(String),
        name: "Realistic Vision XL - 99999",
        timestampUtcMs: expect.any(Number),
        trainedWords: ["building", "tree"],
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
        11111,
      );

      const result = mapper.FromGeneratedImage(generatedImage);

      expect(result.id).toEqual(expect.any(String));
      expect(result.name).toBe("Generated Model 11111");
      expect(result.input.model).toBe("");
      expect(result.input.additionalNetworks).toEqual({});
      expect(result.trainedWords).toEqual([]);
    });

    it("should not include checkpoint in additional networks (case-insensitive)", () => {
      const checkpoint = {
        ...createMockCheckpointResource(),
        model: { name: "Test", type: "Checkpoint" },
      };
      const lora = {
        ...createMockLoraResource(),
        trainedWords: ["detail"],
      };
      const generatedImage = createMockGeneratedImage(
        [checkpoint, lora],
        createMockGeneratedImageParams(),
        55555,
      );

      const result = mapper.FromGeneratedImage(generatedImage);

      expect(result.input.model).toBe(checkpoint.air);
      expect(result.input.additionalNetworks).not.toHaveProperty(
        checkpoint.air,
      );
      expect(result.input.additionalNetworks).toHaveProperty(lora.air);
      expect(result.trainedWords).toEqual(["detail"]);
    });
  });
});
