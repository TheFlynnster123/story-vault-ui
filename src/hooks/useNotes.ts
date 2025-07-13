import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlobAPI } from "../clients/BlobAPI";
import type { Note } from "../models/Note";

const getQueryKey = (chatId: string) => ["notes", chatId];

export interface UseNotesResult {
  notes: Note[];
  isLoading: boolean;
  saveNotes: (notes: Note[]) => Promise<void>;
  refreshNotes: () => void;
}

export const useNotes = (chatId: string): UseNotesResult => {
  const queryClient = useQueryClient();
  const saveNotesMutation = useSaveNotesMutation(chatId);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: getQueryKey(chatId),
    queryFn: async () => await GetNotes(chatId),
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveNotes = async (notes: Note[]) => {
    await saveNotesMutation.mutateAsync(notes);
  };

  const refreshNotes = () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(chatId) });
  };

  return {
    notes,
    isLoading,
    saveNotes,
    refreshNotes,
  };
};

export const GetNotes = async (chatId: string): Promise<Note[]> => {
  const blobContent = await new BlobAPI().getBlob(chatId, "notes");
  if (!blobContent) return [];

  try {
    return JSON.parse(blobContent) as Note[];
  } catch (error) {
    console.error("Failed to parse notes:", error);
    return [];
  }
};

const useSaveNotesMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notes: Note[]) => {
      const content = JSON.stringify(notes);
      await new BlobAPI().saveBlob(chatId, "notes", content);
      return notes;
    },
    onSuccess: (notes) => {
      queryClient.setQueryData(getQueryKey(chatId), notes);
    },
  });
};
