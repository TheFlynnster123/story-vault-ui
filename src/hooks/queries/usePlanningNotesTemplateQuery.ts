import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlobAPI } from "../useBlobAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import type { PlanningNoteTemplate } from "../../models";

export const getPlanningNotesTemplateQueryKey = () => [
  "planning-notes-template",
];

export const GetPlanningNotesTemplate = async (
  blobAPI: BlobAPI
): Promise<PlanningNoteTemplate[]> => {
  const blobContent = await blobAPI.getBlob(
    "global",
    "planning-notes-template"
  );
  if (!blobContent) {
    return [];
  }

  try {
    return JSON.parse(blobContent) as PlanningNoteTemplate[];
  } catch (error) {
    console.error("Failed to parse planning notes template:", error);
    return [];
  }
};

export const usePlanningNotesTemplateQuery = (): PlanningNoteTemplate[] => {
  const blobAPI = useBlobAPI();

  const { data: planningNotesTemplate } = useQuery({
    queryKey: getPlanningNotesTemplateQueryKey(),
    queryFn: async () => await GetPlanningNotesTemplate(blobAPI as BlobAPI),
    enabled: !!blobAPI,
  });

  return planningNotesTemplate || [];
};

export const useUpdatePlanningNotesTemplateMutation = () => {
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templates: PlanningNoteTemplate[]) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const content = JSON.stringify(templates);
      await blobAPI.saveBlob("global", "planning-notes-template", content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getPlanningNotesTemplateQueryKey(),
      });
    },
  });
};
