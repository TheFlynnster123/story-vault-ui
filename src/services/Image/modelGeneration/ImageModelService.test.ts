import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageModelService, type UserImageModels } from "./ImageModelService";
import type { ImageModel } from "./ImageModel";
import { randomUUID } from "crypto";

// Create mock functions that will persist across calls
const mockGet = vi.fn();
const mockSave = vi.fn();
const mockSaveDebounced = vi.fn();
const mockLog = vi.fn();
const mockMapToSchedulerName = vi.fn();

// Mock dependencies
vi.mock("../../Dependencies", () => ({
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
      MapToSchedulerName: mockMapToSchedulerName,
    })),
  },
}));

describe("ImageModelService", () => {
  let service: ImageModelService;

  const createMockImageModel = (
    id: string | undefined = undefined
  ): ImageModel => ({
    id: id ?? randomUUID().toString(),
    timestampUtcMs: Date.now(),
    name: `Test Model ${id}`,
    input: {
      model: "test-model",
      params: {
        prompt: "test prompt",
        negativePrompt: "test negative",
        scheduler: "DPM++ 2M",
        steps: 20,
        cfgScale: 7.5,
        width: 512,
        height: 512,
        clipSkip: 1,
      },
      additionalNetworks: {},
    },
    sampleImageId: undefined,
  });

  const createMockUserImageModels = (
    models: ImageModel[] = []
  ): UserImageModels => ({
    selectedModelId: "",
    models,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    service = new ImageModelService();
  });

  function setupDefaultMocks(): void {
    mockMapToSchedulerName.mockImplementation((scheduler: string) => scheduler);
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
        })
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
        })
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
        expect.any(Error)
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
        expect.any(Error)
      );
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("should map scheduler when saving model", async () => {
      const mockModel = createMockImageModel();
      mockModel.input.params.scheduler = "DPM++ 2M";
      const mockUserModels = createMockUserImageModels();

      mockGet.mockResolvedValue(mockUserModels);
      mockMapToSchedulerName.mockReturnValue("DPM2M");

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(true);
      expect(mockMapToSchedulerName).toHaveBeenCalledWith("DPM++ 2M");

      // Verify the saved model has the mapped scheduler
      const savedData = mockSaveDebounced.mock.calls[0][0] as UserImageModels;
      expect(savedData.models[0].input.params.scheduler).toBe("DPM2M");
    });

    it("should preserve original scheduler when mapping fails", async () => {
      const mockModel = createMockImageModel();
      mockModel.input.params.scheduler = "CustomScheduler";
      const mockUserModels = createMockUserImageModels();

      mockGet.mockResolvedValue(mockUserModels);
      mockMapToSchedulerName.mockReturnValue("CustomScheduler"); // No-op behavior

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(true);
      expect(mockMapToSchedulerName).toHaveBeenCalledWith("CustomScheduler");

      // Verify the saved model has the original scheduler
      const savedData = mockSaveDebounced.mock.calls[0][0] as UserImageModels;
      expect(savedData.models[0].input.params.scheduler).toBe(
        "CustomScheduler"
      );
    });
  });

  describe("GetAllImageModels", () => {
    it("should return parsed models from blob", async () => {
      const mockModels = [createMockImageModel()];
      const mockUserModels = createMockUserImageModels(mockModels);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.GetAllImageModels();

      expect(result).toEqual(mockUserModels);
      expect(result.models).toHaveLength(1);
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
        expect.any(Error)
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
        })
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
        })
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
        expect.any(Error)
      );
    });
  });

  describe("SelectImageModel", () => {
    it("should select model and return it", async () => {
      const modelToSelect = createMockImageModel("Image Model 1");
      const mockUserModels = createMockUserImageModels([modelToSelect]);

      mockGet.mockResolvedValue(mockUserModels);

      const result = await service.SelectImageModel("Image Model 1");

      expect(result).toEqual(modelToSelect);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModelId: "Image Model 1",
        })
      );
    });

    it("should throw error when model not found", async () => {
      const mockUserModels = createMockUserImageModels([]);
      mockGet.mockResolvedValue(mockUserModels);

      await expect(service.SelectImageModel("999")).rejects.toThrow(
        "Image model with ID 999 not found"
      );
    });
  });
});
