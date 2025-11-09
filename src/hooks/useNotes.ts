import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "../models/Note";
import { d } from "../app/Dependencies/Dependencies";
import { getNotesQueryKey } from "../queries/notes/NotesService";

export const useNotes = (chatId: string) => {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: getNotesQueryKey(chatId),
    queryFn: async () => {
      return await d.NotesService(chatId).fetchNotes();
    },
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: Note[]) => {
      await d.NotesService(chatId).save(notes);
      return notes;
    },
    onSuccess: (notes) => {
      // Update cache immediately
      queryClient.setQueryData(getNotesQueryKey(chatId), notes);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: getNotesQueryKey(chatId),
      });
    },
  });

  const saveNotes = async (notes: Note[]) => {
    await saveNotesMutation.mutateAsync(notes);
  };

  const refreshNotes = () => {
    queryClient.invalidateQueries({ queryKey: getNotesQueryKey(chatId) });
  };

  return {
    notes,
    isLoading,
    saveNotes,
    refreshNotes,
  };
};
