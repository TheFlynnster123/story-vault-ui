import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import {
  createDefaultContinuityHistoryStore,
  type ContinuityHistoryStore,
} from "../services/ContinuityHistory";

export const useContinuityHistories = (chatId: string) => {
  const [store, setStore] = useState<ContinuityHistoryStore>(
    createDefaultContinuityHistoryStore,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    const service = d.ContinuityHistoriesService(chatId);

    const load = async () => {
      setStore(await service.get());
      setIsLoading(false);
    };

    void load();
    return service.subscribe(() => void load());
  }, [chatId]);

  return {
    store,
    isLoading,
    save: (nextStore: ContinuityHistoryStore) =>
      d.ContinuityHistoriesService(chatId).save(nextStore),
    saveDebounced: (nextStore: ContinuityHistoryStore) =>
      d.ContinuityHistoriesService(chatId).saveDebounced(nextStore),
  };
};
