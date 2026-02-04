import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";
import { useImageModels } from "./useImageModels";
import type { ImageModel } from "../../services/Image/modelGeneration/ImageModel";

// Mock the dependencies
const mockSaveImageModel = vi.fn();
const mockDeleteImageModel = vi.fn();
const mockSelectImageModel = vi.fn();
const mockGetAllImageModels = vi.fn();
vi.mock("../../services/Dependencies", () => ({
  d: {
    ImageModelService: () => ({
      SaveImageModel: mockSaveImageModel,
      DeleteImageModel: mockDeleteImageModel,
      SelectImageModel: mockSelectImageModel,
      GetAllImageModels: mockGetAllImageModels,
    }),
  },
}));

describe("useImageModels", () => {
  const createMockModel = (id: string, name: string): ImageModel => ({
    id,
    name,
    timestampUtcMs: Date.now(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllImageModels.mockResolvedValue({
      selectedModelId: "",
      models: [],
    });
  });

  it("should update local state when saving a new model (no API refetch)", async () => {
    const newModel = createMockModel("new-model-id", "New Model");

    mockSaveImageModel.mockResolvedValue(true);

    const { result } = renderHook(() => useImageModels());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Save the model
    await act(async () => {
      await result.current.saveImageModel(newModel);
    });

    // Verify the model is added to local state
    expect(result.current.userImageModels.models).toHaveLength(1);
    expect(result.current.userImageModels.models[0]).toEqual(newModel);

    // Verify GetAllImageModels is only called once (during initial load)
    expect(mockGetAllImageModels).toHaveBeenCalledTimes(1);
  });

  it("should update local state when updating existing model (no API refetch)", async () => {
    const existingModel = createMockModel("existing-id", "Original Name");
    const updatedModel = { ...existingModel, name: "Updated Name" };

    mockGetAllImageModels.mockResolvedValue({
      selectedModelId: "",
      models: [existingModel],
    });
    mockSaveImageModel.mockResolvedValue(true);

    const { result } = renderHook(() => useImageModels());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Update the model
    await act(async () => {
      await result.current.saveImageModel(updatedModel);
    });

    // Verify the model is updated in local state
    expect(result.current.userImageModels.models).toHaveLength(1);
    expect(result.current.userImageModels.models[0].name).toBe("Updated Name");

    // Verify GetAllImageModels is only called once (during initial load)
    expect(mockGetAllImageModels).toHaveBeenCalledTimes(1);
  });

  it("should remove model from local state when deleting (no API refetch)", async () => {
    const modelToDelete = createMockModel("delete-me", "Delete Me");
    const modelToKeep = createMockModel("keep-me", "Keep Me");

    mockGetAllImageModels.mockResolvedValue({
      selectedModelId: "",
      models: [modelToDelete, modelToKeep],
    });
    mockDeleteImageModel.mockResolvedValue(true);

    const { result } = renderHook(() => useImageModels());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Delete the model
    await act(async () => {
      await result.current.deleteImageModel("delete-me");
    });

    // Verify only one model remains
    expect(result.current.userImageModels.models).toHaveLength(1);
    expect(result.current.userImageModels.models[0].id).toBe("keep-me");

    // Verify GetAllImageModels is only called once (during initial load)
    expect(mockGetAllImageModels).toHaveBeenCalledTimes(1);
  });

  it("should update selection in local state when selecting model (no API refetch)", async () => {
    const model = createMockModel("select-me", "Select Me");

    mockGetAllImageModels.mockResolvedValue({
      selectedModelId: "",
      models: [model],
    });
    mockSelectImageModel.mockResolvedValue(model);

    const { result } = renderHook(() => useImageModels());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Select the model
    await act(async () => {
      await result.current.selectImageModel("select-me");
    });

    // Verify selection is updated in local state
    expect(result.current.userImageModels.selectedModelId).toBe("select-me");

    // Verify GetAllImageModels is only called once (during initial load)
    expect(mockGetAllImageModels).toHaveBeenCalledTimes(1);
  });
});
