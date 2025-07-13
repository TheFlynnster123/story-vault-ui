import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlobAPI } from "../../clients/BlobAPI";
import type { PlanningNotesTemplates } from "../../models";

export const usePlanningNotesTemplates = (
  chatId: string
): PlanningNotesTemplates[] => {
  const { data: planningNotesTemplate } = useQuery({
    queryKey: getQueryKey(),
    queryFn: async () => await GetPlanningNotesTemplates(chatId),
  });

  return planningNotesTemplate || [];
};

export const getQueryKey = () => ["planning-notes-templates"];

export const GetPlanningNotesTemplates = async (
  chatId: string
): Promise<PlanningNotesTemplates[]> => {
  const blobContent = await new BlobAPI().getBlob(
    chatId,
    "planning-notes-templates"
  );

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templates: PlanningNotesTemplates[]) => {
      const content = JSON.stringify(templates);
      await new BlobAPI().saveBlob(chatId, "planning-notes-templates", content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(),
      });
    },
  });
};
