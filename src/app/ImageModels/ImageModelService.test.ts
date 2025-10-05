import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageModelService, type UserImageModels } from "./ImageModelService";
import type { ImageModel } from "./ImageModel";
import { d } from "../Dependencies/Dependencies";

// Create mock functions that will persist across calls
const mockGetBlob = vi.fn();
const mockSaveBlob = vi.fn();
const mockLog = vi.fn();

const GLOBAL_CHAT_ID = "GLOBAL_CHAT_ID";

// Mock dependencies
vi.mock("../Dependencies/Dependencies", () => ({
  d: {
    BlobAPI: vi.fn(() => ({
      GLOBAL_CHAT_ID: GLOBAL_CHAT_ID,
      getBlob: mockGetBlob,
      saveBlob: mockSaveBlob,
    })),
    ErrorService: vi.fn(() => ({
      log: mockLog,
    })),
  },
}));

describe("ImageModelService", () => {
  let service: ImageModelService;

  const createMockImageModel = (id: number = 1): ImageModel => ({
    id,
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
  });

  const createMockUserImageModels = (
    models: ImageModel[] = []
  ): UserImageModels => ({
    selectedModelId: "",
    models,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImageModelService();
  });

  describe("SaveImageModel", () => {
    it("should save new model successfully", async () => {
      const mockModel = createMockImageModel();
      const mockUserModels = createMockUserImageModels();

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockResolvedValue(true);

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(true);
      expect(mockSaveBlob).toHaveBeenCalledWith(
        GLOBAL_CHAT_ID,
        "UserImageModels",
        expect.stringContaining('"id":1')
      );
    });

    it("should update existing model", async () => {
      const existingModel = createMockImageModel();
      const updatedModel = { ...existingModel, name: "Updated Model" };
      const mockUserModels = createMockUserImageModels([existingModel]);

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockResolvedValue(true);

      const result = await service.SaveImageModel(updatedModel);

      expect(result).toBe(true);
      expect(mockSaveBlob).toHaveBeenCalledWith(
        GLOBAL_CHAT_ID,
        "UserImageModels",
        expect.stringContaining('"name":"Updated Model"')
      );
    });

    it("should return false on error", async () => {
      const mockModel = createMockImageModel();
      const mockUserModels = createMockUserImageModels();

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockRejectedValue(new Error("Save Error"));

      const result = await service.SaveImageModel(mockModel);

      expect(result).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to save image model",
        expect.any(Error)
      );
    });
  });

  describe("GetAllImageModels", () => {
    it("should return parsed models from blob", async () => {
      const mockModels = [createMockImageModel()];
      const mockUserModels = createMockUserImageModels(mockModels);

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));

      const result = await service.GetAllImageModels();

      expect(result).toEqual(mockUserModels);
      expect(result.models).toHaveLength(1);
    });

    it("should return default models when blob is empty", async () => {
      mockGetBlob.mockResolvedValue(null);

      const result = await service.GetAllImageModels();

      expect(result).toEqual({
        selectedModelId: "",
        models: [],
      });
    });

    it("should return an empty list on error", async () => {
      mockGetBlob.mockResolvedValue(
        "invalid json that will cause parsing to fail in an unexpected way"
      );

      const result = await service.GetAllImageModels();

      expect(result).toEqual({
        selectedModelId: "",
        models: [],
      });
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to parse user image models",
        expect.any(Error)
      );
    });
  });

  describe("DeleteImageModel", () => {
    it("should delete model successfully", async () => {
      const modelToDelete = createMockImageModel(1);
      const modelToKeep = createMockImageModel(2);
      const mockUserModels = createMockUserImageModels([
        modelToDelete,
        modelToKeep,
      ]);

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockResolvedValue(true);

      const result = await service.DeleteImageModel("1");

      expect(result).toBe(true);
      expect(mockSaveBlob).toHaveBeenCalledWith(
        GLOBAL_CHAT_ID,
        "UserImageModels",
        expect.not.stringContaining('"id":1')
      );
    });

    it("should reset selected model when deleting selected model", async () => {
      const selectedModel = createMockImageModel(1);
      const mockUserModels = {
        selectedModelId: "1",
        models: [selectedModel],
      };

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockResolvedValue(true);

      const result = await service.DeleteImageModel("1");

      expect(result).toBe(true);
      expect(mockSaveBlob).toHaveBeenCalledWith(
        GLOBAL_CHAT_ID,
        "UserImageModels",
        expect.stringContaining('"selectedModelId":""')
      );
    });

    it("should return false on error", async () => {
      const mockUserModels = createMockUserImageModels([
        createMockImageModel(),
      ]);

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockRejectedValue(new Error("Save Error"));

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
      const modelToSelect = createMockImageModel(1);
      const mockUserModels = createMockUserImageModels([modelToSelect]);

      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));
      mockSaveBlob.mockResolvedValue(true);

      const result = await service.SelectImageModel("1");

      expect(result).toEqual(modelToSelect);
      expect(mockSaveBlob).toHaveBeenCalledWith(
        GLOBAL_CHAT_ID,
        "UserImageModels",
        expect.stringContaining('"selectedModelId":"1"')
      );
    });

    it("should throw error when model not found", async () => {
      const mockUserModels = createMockUserImageModels([]);
      mockGetBlob.mockResolvedValue(JSON.stringify(mockUserModels));

      await expect(service.SelectImageModel("999")).rejects.toThrow(
        "Image model with ID 999 not found"
      );
    });
  });
});
