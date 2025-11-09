import { useEffect, useState } from "react";
import { getPlanningNotesCacheInstance } from "../app/ChatGeneration/PlanningNotesService";

export const usePlanningNotesCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const cache = getPlanningNotesCacheInstance(chatId);

  useEffect(() => {
    if (!cache) return;
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    planningNotes: cache?.getPlanningNotes() || [],
    isLoading: cache?.IsLoading || false,
    updateNoteContent: (noteId: string, content: string) =>
      cache?.updateNoteContent(noteId, content),
    savePlanningNotes: async () => await cache?.savePlanningNotes(),
    refreshFromDatabase: async () => await cache?.refreshFromDatabase(),
    generateUpdatedPlanningNotes: async (chatMessages: any[]) =>
      await cache?.generateUpdatedPlanningNotes(chatMessages),
  };
};
