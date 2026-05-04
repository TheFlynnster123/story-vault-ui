import { useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";
import type { ChatImageVariants } from "../services/ChatImageVariantsManagedBlob";
import type { ImageModelVariant } from "../services/ImageModelVariant";
import type { ImageModel } from "../services/modelGeneration/ImageModel";

export const useChatImageVariants = (chatId: string) => {
  const [chatImageVariants, setChatImageVariants] = useState<ChatImageVariants>(
    { selectedVariantId: "", variants: [] },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = d.ChatImageVariantService(chatId);

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
      d.ErrorService().log(errorMessage, err);
      return null;
    }
  };

  const loadVariants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.GetAll();
      setChatImageVariants(data);
    } catch (err) {
      setError("Failed to load image model variants");
      d.ErrorService().log("Failed to load image model variants", err);
    } finally {
      setLoading(false);
    }
  };

  const updateVariantInState = (updated: ImageModelVariant) => {
    setChatImageVariants((prev) => ({
      ...prev,
      variants: prev.variants.some((v) => v.id === updated.id)
        ? prev.variants.map((v) => (v.id === updated.id ? updated : v))
        : [...prev.variants, updated],
    }));
  };

  const removeVariantFromState = (variantId: string) => {
    setChatImageVariants((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== variantId),
      selectedVariantId:
        prev.selectedVariantId === variantId ? "" : prev.selectedVariantId,
    }));
  };

  const saveVariant = async (variant: ImageModelVariant): Promise<boolean> => {
    const success = await withErrorHandling(
      () => service.SaveVariant(variant),
      "Failed to save image model variant",
      (result) => result && updateVariantInState(variant),
    );
    return success ?? false;
  };

  const deleteVariant = async (variantId: string): Promise<boolean> => {
    const success = await withErrorHandling(
      () => service.DeleteVariant(variantId),
      "Failed to delete image model variant",
      (result) => result && removeVariantFromState(variantId),
    );
    return success ?? false;
  };

  const selectVariant = async (variantId: string): Promise<boolean> => {
    return (
      (await withErrorHandling(
        () => service.SelectVariant(variantId),
        "Failed to select image model variant",
        (ok) =>
          ok &&
          setChatImageVariants((prev) => ({
            ...prev,
            selectedVariantId: variantId,
          })),
      )) ?? false
    );
  };

  const createVariant = async (
    parentModelId: string,
    name: string,
  ): Promise<ImageModelVariant | null> => {
    return await withErrorHandling(
      () => service.CreateVariant(parentModelId, name),
      "Failed to create image model variant",
      (v) => v && updateVariantInState(v),
    );
  };

  const findParentModel = async (
    parentModelId: string,
  ): Promise<ImageModel | null> => {
    return await service.findParentModel(parentModelId);
  };

  const getSelectedVariant = (): ImageModelVariant | null => {
    if (!chatImageVariants.selectedVariantId) return null;
    return (
      chatImageVariants.variants.find(
        (v) => v.id === chatImageVariants.selectedVariantId,
      ) ?? null
    );
  };

  useEffect(() => {
    loadVariants();
    const unsubscribe = service.subscribe(() => {
      loadVariants();
    });
    return unsubscribe;
  }, [chatId]);

  return {
    chatImageVariants,
    loading,
    error,
    saveVariant,
    deleteVariant,
    selectVariant,
    createVariant,
    findParentModel,
    getSelectedVariant,
    refreshVariants: loadVariants,
  };
};
