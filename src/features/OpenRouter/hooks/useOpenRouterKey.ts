import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";

// Singleton to store the key status across all hook instances
let openRouterKeyStatusSingleton: boolean | undefined = undefined;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<(status: boolean | undefined) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(openRouterKeyStatusSingleton));
};

const fetchOpenRouterKeyStatus = async () => {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const api = d.OpenRouterKeyAPI();

    const isValid = await api.hasValidOpenRouterKey();
    openRouterKeyStatusSingleton = isValid;

    if (isValid) await d.EncryptionManager().ensureKeysInitialized();

    notifyListeners();
  })().finally(() => {
    fetchPromise = null;
  });

  return fetchPromise;
};

export const useOpenRouterKey = (enabled = true) => {
  const [hasValidOpenRouterKey, setHasValidOpenRouterKey] = useState<
    boolean | undefined
  >(openRouterKeyStatusSingleton);

  const refreshOpenRouterKeyStatus = async () => {
    await fetchOpenRouterKeyStatus();
  };

  useEffect(() => {
    // Register listener
    listeners.add(setHasValidOpenRouterKey);

    // Only fetch if status is undefined (not yet initialized)
    if (enabled && openRouterKeyStatusSingleton === undefined) {
      void fetchOpenRouterKeyStatus();
    }

    // Cleanup listener on unmount
    return () => {
      listeners.delete(setHasValidOpenRouterKey);
    };
  }, [enabled]);

  return { hasValidOpenRouterKey, refreshOpenRouterKeyStatus };
};
