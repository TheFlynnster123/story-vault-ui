import { useEffect, useState } from "react";
import type { Memory } from "../../services/ChatGeneration/Memory";
import { d } from "../../services/Dependencies";

interface UseMemoriesResult {
  memories: Memory[];
  isLoading: boolean;
  saveMemories: (memories: Memory[]) => Promise<void>;
  saveMemoriesDebounced: (memories: Memory[]) => Promise<void>;
}

export const useMemories = (chatId: string): UseMemoriesResult => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const blob = () => d.MemoriesManagedBlob(chatId);

  const loadMemories = async () => {
    const data = await blob().get();

    setMemories(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = blob().subscribe(() => {
      loadMemories();
    });

    loadMemories();

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  const saveMemories = async (newMemories: Memory[]) => {
    await blob().save(newMemories);
  };

  const saveMemoriesDebounced = async (newMemories: Memory[]) => {
    await blob().saveDebounced(newMemories);
  };

  return {
    memories,
    isLoading,
    saveMemories,
    saveMemoriesDebounced,
  };
};
