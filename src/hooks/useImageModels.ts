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

  const saveImageModel = async (model: ImageModel): Promise<boolean> => {
    try {
      setError(null);
      const success = await imageModelService.SaveImageModel(model);
      if (success) {
        await loadImageModels(); // Refresh the list
      }
      return success;
    } catch (err) {
      setError("Failed to save image model");
      console.error("Error saving image model:", err);
      return false;
    }
  };

  const deleteImageModel = async (modelId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await imageModelService.DeleteImageModel(modelId);
      if (success) {
        await loadImageModels(); // Refresh the list
      }
      return success;
    } catch (err) {
      setError("Failed to delete image model");
      console.error("Error deleting image model:", err);
      return false;
    }
  };

  const selectImageModel = async (
    modelId: string
  ): Promise<ImageModel | null> => {
    try {
      setError(null);
      const model = await imageModelService.SelectImageModel(modelId);
      await loadImageModels(); // Refresh to update selected state
      return model;
    } catch (err) {
      setError("Failed to select image model");
      console.error("Error selecting image model:", err);
      return null;
    }
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
