import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";

// Singleton to store the key status across all hook instances
let openRouterKeyStatusSingleton: boolean | undefined = undefined;
const listeners = new Set<(status: boolean | undefined) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(openRouterKeyStatusSingleton));
};

const fetchOpenRouterKeyStatus = async () => {
  const api = d.OpenRouterKeyAPI();

  const isValid = await api.hasValidOpenRouterKey();
  openRouterKeyStatusSingleton = isValid;

  if (isValid) await d.EncryptionManager().ensureKeysInitialized();

  notifyListeners();
};

export const useOpenRouterKey = () => {
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
    if (openRouterKeyStatusSingleton === undefined) {
      fetchOpenRouterKeyStatus();
    }

    // Cleanup listener on unmount
    return () => {
      listeners.delete(setHasValidOpenRouterKey);
    };
  }, []);

  return { hasValidOpenRouterKey, refreshOpenRouterKeyStatus };
};
