import { useEffect, useState } from "react";
import { d } from "../../services/Dependencies";

// Singleton to store the key status across all hook instances
let grokKeyStatusSingleton: boolean | undefined = undefined;
const listeners = new Set<(status: boolean | undefined) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(grokKeyStatusSingleton));
};

const fetchGrokKeyStatus = async () => {
  const api = d.GrokKeyAPI();
  const isValid = await api.hasValidGrokKey();
  grokKeyStatusSingleton = isValid;
  notifyListeners();
};

export const useGrokKey = () => {
  const [hasValidGrokKey, setHasValidGrokKey] = useState<boolean | undefined>(
    grokKeyStatusSingleton
  );

  const refreshGrokKeyStatus = async () => {
    await fetchGrokKeyStatus();
  };

  useEffect(() => {
    // Register listener
    listeners.add(setHasValidGrokKey);

    // Only fetch if status is undefined (not yet initialized)
    if (grokKeyStatusSingleton === undefined) {
      fetchGrokKeyStatus();
    }

    // Cleanup listener on unmount
    return () => {
      listeners.delete(setHasValidGrokKey);
    };
  }, []);

  return { hasValidGrokKey, refreshGrokKeyStatus };
};
