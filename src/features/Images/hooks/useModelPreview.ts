import { useQuery } from "@tanstack/react-query";
import { d } from "../../../services/Dependencies";
import { extractModelIdFromAir } from "../services/modelGeneration/AirUtils";
import type { ModelPreview } from "../services/api/CivitModelInfoQuery";

const getModelPreviewQueryKey = (modelId: number) => [
  "civit-model-preview",
  modelId,
];

export const useModelPreview = (
  air: string,
): {
  preview: ModelPreview | undefined;
  isLoading: boolean;
} => {
  const modelId = extractModelIdFromAir(air);

  const { data, isLoading } = useQuery({
    queryKey: getModelPreviewQueryKey(modelId ?? 0),
    queryFn: () => d.CivitModelInfoQuery().GetPreview(modelId!),
    enabled: !!modelId,
    staleTime: 1000 * 60 * 30, // 30 minutes - model previews rarely change
    retry: 1,
  });

  return {
    preview: data,
    isLoading: !!modelId && isLoading,
  };
};
