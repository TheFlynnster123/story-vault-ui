import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageModelService, type UserImageModels } from "./ImageModelService";
import type { AnyImageModel, ImageModel } from "./ImageModel";
import { isLegacyJobImageModel, isWorkflowImageModel } from "./ImageModel";
import { randomUUID } from "crypto";

// Create mock functions that will persist across calls
const mockGet = vi.fn();
const mockSave = vi.fn();
const mockSaveDebounced = vi.fn();
const mockLog = vi.fn();

// Mock dependencies
vi.mock("../../../../services/Dependencies", () => ({
  d: {
    ImageModelsManagedBlob: vi.fn(() => ({
      get: mockGet,
      save: mockSave,
      saveDebounced: mockSaveDebounced,
    })),
    ErrorService: vi.fn(() => ({
      log: mockLog,
    })),
    SchedulerMapper: vi.fn(() => ({
      MapToSampleMethodParams: vi.fn(() => ({
        sampleMethod: "euler_a",
      })),
    })),
  },
}));

describe("ImageModelService", () => {
  let service: ImageModelService;

  const createMockImageModel = (
    id: string | undefined = undefined,
  ): ImageModel => ({
    format: "workflow",
    id: id ?? randomUUID().toString(),
    timestampUtcMs: Date.now(),
    name: `Test Model ${id}`,
    input: {
      engine: "sdcpp",
      ecosystem: "sdxl",
      operation: "createImage",
      model: "test-model",
      prompt: "test prompt",
      negativePrompt: "test negative",
      sampleMethod: "dpmpp_2m",
      steps: 20,
      cfgScale: 7.5,
      width: 512,
      height: 512,
      loras: {},
    },
  });

  const createMockUserImageModels = (
    models: AnyImageModel[] = [],
  ): UserImageModels => ({
    selectedModelId: "",
    models,
  });

  const createLegacyImageModel = (id = "legacy-model"): any => ({
    id,
    timestampUtcMs: 123,
    name: "Legacy Model",
    sampleImageId: "legacy-sample-id",
    input: {
      model: "urn:air:sd1:checkpoint:civitai:1@2",
      params: {
        prompt: "legacy prompt",
        negativePrompt: "legacy negative",
        scheduler: "Euler a",
        steps: 22,
        cfgScale: 8,
        width: 768,
        height: 512,
        clipSkip: 1,
      },
      additionalNetworks: {
        "urn:air:sd1:lora:civitai:3@4": { strength: 0.65 },
      },
    },
  });

  const createUnstampedFlatImageModel = (id = "flat-legacy-model"): any => {
    const { format, ...model } = createMockImageModel(id);
    return model;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    service = new ImageModelService();
  });

  function setupDefaultMocks(): void {
    mockGet.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);
    mockSaveDebounced.mockResolvedValue(undefined);
  }

  describe("SaveImageModel", () => {
    it("should save new model successfully", async () => {
      const mockModel = createMockImageModel("Image Model 1");
      const mockUserModels = createMockUserImageModels();

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          models: expect.arrayContaining([
            expect.objectContaining({ id: "Image Model 1" }),
          ]),
        }),
      );
    });

    it("should update existing model", async () => {
      const existingModel = createMockImageModel();
      const updatedModel = { ...existingModel, name: "Updated Model" };
      const mockUserModels = createMockUserImageModels([existingModel]);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.SaveImageModel(updatedModel);

      expect(result).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          models: expect.arrayContaining([
            expect.objectContaining({ name: "Updated Model" }),
          ]),
        }),
      );
    });

    it("should return false on error", async () => {
      const mockModel = createMockImageModel();
      const mockUserModels = createMockUserImageModels();

      mockGet.mockResolvedValue(mockUserModels);
      mockSaveDebounced.mockRejectedValue(new Error("Save Error"));

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to save image model",
        expect.any(Error),
      );
    });

    it("should return false when model has no id", async () => {
      const modelWithoutId = createMockImageModel();
      // Remove the id by setting it to an invalid value
      (modelWithoutId as any).id = undefined;

      const result = await service.SaveImageModel(modelWithoutId);

      expect(result).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Cannot save image model without a valid ID",
        expect.any(Error),
      );
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe("GetAllImageModels", () => {
    it("should return parsed models from blob", async () => {
      const mockModels = [createMockImageModel()];
      const mockUserModels = createMockUserImageModels(mockModels);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.GetAllImageModels();

      expect(result).toEqual({
        ...mockUserModels,
        models: [expect.objectContaining({ ...mockModels[0], format: "workflow" })],
      });
      expect(result.models).toHaveLength(1);
    });

    it("classifies legacy job models without silently converting them", async () => {
      const legacy = createLegacyImageModel();
      mockGet.mockResolvedValue(createMockUserImageModels([legacy]));

      const result = await service.GetAllImageModels();

      expect(result.models).toHaveLength(1);
      expect(isLegacyJobImageModel(result.models[0])).toBe(true);
      expect((result.models[0].input as any).params.prompt).toBe(
        "legacy prompt",
      );
      expect(result.models[0].sampleWorkflowId).toBe("legacy-sample-id");
    });

    it("classifies unstamped flat models as legacy until explicit migration", async () => {
      const legacy = createUnstampedFlatImageModel();
      mockGet.mockResolvedValue(createMockUserImageModels([legacy]));

      const result = await service.GetAllImageModels();

      expect(result.models).toHaveLength(1);
      expect(isLegacyJobImageModel(result.models[0])).toBe(true);
      expect((result.models[0].input as any).prompt).toBe("test prompt");
    });

    it("should return default models when blob is empty", async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await service.GetAllImageModels();

      expect(result).toEqual({
        selectedModelId: "",
        models: [],
      });
    });

    it("should return an empty list on error", async () => {
      mockGet.mockRejectedValue(new Error("Failed to get blob"));

      const result = await service.GetAllImageModels();

      expect(result).toEqual({
        selectedModelId: "",
        models: [],
      });
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to get image models",
        expect.any(Error),
      );
    });
  });

  describe("DeleteImageModel", () => {
    it("should delete model successfully", async () => {
      const modelToDelete = createMockImageModel("1");
      const modelToKeep = createMockImageModel("2");
      const mockUserModels = createMockUserImageModels([
        modelToDelete,
        modelToKeep,
      ]);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.DeleteImageModel("1");

      expect(result).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          models: expect.not.arrayContaining([
            expect.objectContaining({ id: "1" }),
          ]),
        }),
      );
    });

    it("should reset selected model when deleting selected model", async () => {
      const selectedModel = createMockImageModel("1");
      const mockUserModels = {
        selectedModelId: "1",
        models: [selectedModel],
      };

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.DeleteImageModel("1");

      expect(result).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModelId: "",
        }),
      );
    });

    it("should return false on error", async () => {
      const mockUserModels = createMockUserImageModels([
        createMockImageModel(),
      ]);

      mockGet.mockResolvedValue(mockUserModels);
      mockSaveDebounced.mockRejectedValue(new Error("Save Error"));

      const result = await service.DeleteImageModel("1");

      expect(result).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to delete image model",
        expect.any(Error),
      );
    });
  });

  describe("SelectImageModel", () => {
    it("should select model and return it", async () => {
      const modelToSelect = createMockImageModel("Image Model 1");
      const mockUserModels = createMockUserImageModels([modelToSelect]);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.SelectImageModel("Image Model 1");

      expect(result).toEqual(
        expect.objectContaining({ ...modelToSelect, format: "workflow" }),
      );
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModelId: "Image Model 1",
        }),
      );
    });

    it("throws when selecting a legacy job model", async () => {
      mockGet.mockResolvedValue(
        createMockUserImageModels([createLegacyImageModel()]),
      );

      await expect(service.SelectImageModel("legacy-model")).rejects.toThrow(
        "Migrate this legacy image model",
      );
      expect(mockSaveDebounced).not.toHaveBeenCalled();
    });

    it("should throw error when model not found", async () => {
      const mockUserModels = createMockUserImageModels([]);
      mockGet.mockResolvedValue(mockUserModels);

      await expect(service.SelectImageModel("999")).rejects.toThrow(
        "Image model with ID 999 not found",
      );
    });
  });

  describe("MigrateImageModelToWorkflow", () => {
    it("converts and saves a legacy job model as a workflow model", async () => {
      mockGet.mockResolvedValue(
        createMockUserImageModels([createLegacyImageModel()]),
      );

      const migrated =
        await service.MigrateImageModelToWorkflow("legacy-model");

      expect(migrated).not.toBeNull();
      expect(migrated?.id).toBe("legacy-model");
      expect(migrated?.sampleWorkflowId).toBe("legacy-sample-id");
      expect(migrated?.input.prompt).toBe("legacy prompt");
      expect(migrated?.input.ecosystem).toBe("sd1");
      expect(migrated?.input.clipSkip).toBe(1);
      expect(migrated?.input.loras).toEqual({
        "urn:air:sd1:lora:civitai:3@4": 0.65,
      });
      expect(isWorkflowImageModel(migrated)).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          models: [expect.objectContaining({ format: "workflow" })],
        }),
      );
    });

    it("stamps an unstamped flat model as workflow when migrated", async () => {
      mockGet.mockResolvedValue(
        createMockUserImageModels([createUnstampedFlatImageModel()]),
      );

      const migrated =
        await service.MigrateImageModelToWorkflow("flat-legacy-model");

      expect(migrated?.format).toBe("workflow");
      expect(migrated?.input.prompt).toBe("test prompt");
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          models: [expect.objectContaining({ format: "workflow" })],
        }),
      );
    });
  });
});
