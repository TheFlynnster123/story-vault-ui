import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "../models/Note";
import { d } from "../app/Dependencies/Dependencies";
import { getPlanningNotesQueryKey } from "../app/ChatGeneration/PlanningNotesService";

export const usePlanningNotes = (chatId: string) => {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: getPlanningNotesQueryKey(chatId),
    queryFn: async () => {
      return await d.PlanningNotesService(chatId).fetchPlanningNotes();
    },
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: Note[]) => {
      await d.PlanningNotesService(chatId).savePlanningNotes(notes);
      return notes;
    },
    onSuccess: (notes) => {
      queryClient.setQueryData(getPlanningNotesQueryKey(chatId), notes);
      queryClient.invalidateQueries({
        queryKey: getPlanningNotesQueryKey(chatId),
      });
    },
  });

  const saveNotes = async (notes: Note[]) => {
    await saveNotesMutation.mutateAsync(notes);
  };

  const refreshNotes = () => {
    queryClient.invalidateQueries({
      queryKey: getPlanningNotesQueryKey(chatId),
    });
  };

  return {
    notes,
    isLoading,
    saveNotes,
    refreshNotes,
  };
};
