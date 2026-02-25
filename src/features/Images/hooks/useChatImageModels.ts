import { useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";
import type { ChatImageModels } from "../services/ChatImageModelsManagedBlob";
import type { ImageModel } from "../services/modelGeneration/ImageModel";

export const useChatImageModels = (chatId: string) => {
  const [chatImageModels, setChatImageModels] = useState<ChatImageModels>({
    selectedModelId: "",
    models: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = d.ChatImageModelService(chatId);

  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    errorMessage: string,
    onSuccess?: (result: T) => void,
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

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const models = await service.GetAll();
      setChatImageModels(models);
    } catch (err) {
      setError("Failed to load chat image models");
      console.error("Error loading chat image models:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateModelInState = (updatedModel: ImageModel) => {
    setChatImageModels((prev) => ({
      ...prev,
      models: prev.models.some((m) => m.id === updatedModel.id)
        ? prev.models.map((m) => (m.id === updatedModel.id ? updatedModel : m))
        : [...prev.models, updatedModel],
    }));
  };

  const removeModelFromState = (modelId: string) => {
    setChatImageModels((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== modelId),
      selectedModelId:
        prev.selectedModelId === modelId ? "" : prev.selectedModelId,
    }));
  };

  const updateSelectedModelInState = (modelId: string) => {
    setChatImageModels((prev) => ({
      ...prev,
      selectedModelId: modelId,
    }));
  };

  const saveModel = async (model: ImageModel): Promise<boolean> => {
    const success = await withErrorHandling(
      () => service.SaveModel(model),
      "Failed to save chat image model",
      (result) => result && updateModelInState(model),
    );
    return success ?? false;
  };

  const deleteModel = async (modelId: string): Promise<boolean> => {
    const success = await withErrorHandling(
      () => service.DeleteModel(modelId),
      "Failed to delete chat image model",
      (result) => result && removeModelFromState(modelId),
    );
    return success ?? false;
  };

  const selectModel = async (modelId: string): Promise<ImageModel | null> => {
    return await withErrorHandling(
      () => service.SelectModel(modelId),
      "Failed to select chat image model",
      (model) => model && updateSelectedModelInState(modelId),
    );
  };

  const addFromTemplate = async (
    templateModelId: string,
  ): Promise<ImageModel | null> => {
    return await withErrorHandling(
      () => service.AddFromTemplate(templateModelId),
      "Failed to add model from template",
      (model) => model && updateModelInState(model),
    );
  };

  const getSelectedModel = (): ImageModel | null => {
    if (!chatImageModels.selectedModelId) return null;
    return (
      chatImageModels.models.find(
        (model) => model.id === chatImageModels.selectedModelId,
      ) || null
    );
  };

  useEffect(() => {
    loadModels();

    const unsubscribe = service.subscribe(() => {
      loadModels();
    });

    return unsubscribe;
  }, [chatId]);

  return {
    chatImageModels,
    loading,
    error,
    saveModel,
    deleteModel,
    selectModel,
    addFromTemplate,
    getSelectedModel,
    refreshModels: loadModels,
  };
};
