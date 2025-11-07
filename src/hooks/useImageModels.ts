import { useState, useEffect } from "react";
import { d } from "../app/Dependencies/Dependencies";
import type { ImageModel } from "../app/ImageModels/ImageModel";
import type { UserImageModels } from "../app/ImageModels/ImageModelService";

export const useImageModels = () => {
  const [userImageModels, setUserImageModels] = useState<UserImageModels>({
    selectedModelId: "",
    models: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const imageModelService = d.ImageModelService();

  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    errorMessage: string,
    onSuccess?: (result: T) => void
  ): Promise<T | null> => {
    try {
      setError(null);
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(errorMessage);
      console.error(`${errorMessage}:`, err);
      return null;
    }
  };

  const loadImageModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const models = await imageModelService.GetAllImageModels();
      setUserImageModels(models);
    } catch (err) {
      setError("Failed to load image models");
      console.error("Error loading image models:", err);
    } finally {
      setLoading(false);
    }
  };

  const modelExists = (models: ImageModel[], modelId: string): boolean =>
    models.some((m) => m.id === modelId);

  const updateExistingModel = (
    models: ImageModel[],
    updatedModel: ImageModel
  ): ImageModel[] =>
    models.map((m) => (m.id === updatedModel.id ? updatedModel : m));

  const addNewModel = (
    models: ImageModel[],
    newModel: ImageModel
  ): ImageModel[] => [...models, newModel];

  const updateModelInState = (updatedModel: ImageModel) => {
    setUserImageModels((prev) => ({
      ...prev,
      models: modelExists(prev.models, updatedModel.id)
        ? updateExistingModel(prev.models, updatedModel)
        : addNewModel(prev.models, updatedModel),
    }));
  };

  const removeModelById = (
    models: ImageModel[],
    modelId: string
  ): ImageModel[] => models.filter((m) => m.id !== modelId);

  const clearSelectionIfMatch = (
    currentSelection: string,
    modelId: string
  ): string => (currentSelection === modelId ? "" : currentSelection);

  const removeModelFromState = (modelId: string) => {
    setUserImageModels((prev) => ({
      ...prev,
      models: removeModelById(prev.models, modelId),
      selectedModelId: clearSelectionIfMatch(prev.selectedModelId, modelId),
    }));
  };

  const updateSelectedModelInState = (modelId: string) => {
    setUserImageModels((prev) => ({
      ...prev,
      selectedModelId: modelId,
    }));
  };

  const saveImageModel = async (model: ImageModel): Promise<boolean> => {
    const success = await withErrorHandling(
      () => imageModelService.SaveImageModel(model),
      "Failed to save image model",
      (result) => result && updateModelInState(model)
    );
    return success ?? false;
  };

  const deleteImageModel = async (modelId: string): Promise<boolean> => {
    const success = await withErrorHandling(
      () => imageModelService.DeleteImageModel(modelId),
      "Failed to delete image model",
      (result) => result && removeModelFromState(modelId)
    );
    return success ?? false;
  };

  const selectImageModel = async (
    modelId: string
  ): Promise<ImageModel | null> => {
    return await withErrorHandling(
      () => imageModelService.SelectImageModel(modelId),
      "Failed to select image model",
      (model) => model && updateSelectedModelInState(modelId)
    );
  };

  const getSelectedModel = (): ImageModel | null => {
    if (!userImageModels.selectedModelId) return null;
    return (
      userImageModels.models.find(
        (model) => model.id === userImageModels.selectedModelId
      ) || null
    );
  };

  useEffect(() => {
    loadImageModels();
  }, []);

  return {
    userImageModels,
    loading,
    error,
    saveImageModel,
    deleteImageModel,
    selectImageModel,
    getSelectedModel,
    refreshModels: loadImageModels,
  };
};
