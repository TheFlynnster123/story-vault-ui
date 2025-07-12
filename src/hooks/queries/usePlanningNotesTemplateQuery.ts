import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlobAPI } from "../useBlobAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import type { PlanningNotesTemplates } from "../../models";

export const usePlanningNotesTemplates = (
  chatId: string
): PlanningNotesTemplates[] => {
  const blobAPI = useBlobAPI();

  const { data: planningNotesTemplate } = useQuery({
    queryKey: getQueryKey(),
    queryFn: async () =>
      await GetPlanningNotesTemplates(chatId, blobAPI as BlobAPI),
    enabled: !!blobAPI,
  });

  return planningNotesTemplate || [];
};

export const getQueryKey = () => ["planning-notes-templates"];

export const GetPlanningNotesTemplates = async (
  chatId: string,
  blobAPI: BlobAPI
): Promise<PlanningNotesTemplates[]> => {
  const blobContent = await blobAPI.getBlob(chatId, "planning-notes-templates");

  if (!blobContent) {
    return [];
  }

  try {
    return JSON.parse(blobContent) as PlanningNotesTemplates[];
  } catch (error) {
    console.error("Failed to parse planning notes template:", error);
    return [];
  }
};

export const useUpdatePlanningNotesTemplateMutation = (chatId: string) => {
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templates: PlanningNotesTemplates[]) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const content = JSON.stringify(templates);
      await blobAPI.saveBlob(chatId, "planning-notes-templates", content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(),
      });
    },
  });
};
