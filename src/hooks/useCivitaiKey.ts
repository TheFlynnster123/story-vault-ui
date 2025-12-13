import { useEffect, useState } from "react";
import { CivitKeyAPI } from "../clients/CivitKeyAPI";
import { d } from "../app/Dependencies/Dependencies";

// Singleton to store the key status across all hook instances
let civitaiKeyStatusSingleton: boolean | undefined = undefined;
const listeners = new Set<(status: boolean | undefined) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(civitaiKeyStatusSingleton));
};

const fetchCivitaiKeyStatus = async () => {
  try {
    const api = new CivitKeyAPI();
    const isValid = await api.hasValidCivitaiKey();
    civitaiKeyStatusSingleton = isValid;
    notifyListeners();
  } catch (e) {
    d.ErrorService().log("Failed to check Civitai key status", e);
  }
};

export const useCivitaiKey = () => {
  const [hasValidCivitaiKey, setHasValidCivitaiKey] = useState<
    boolean | undefined
  >(civitaiKeyStatusSingleton);

  const refreshCivitaiKeyStatus = async () => {
    await fetchCivitaiKeyStatus();
  };

  useEffect(() => {
    // Register listener
    listeners.add(setHasValidCivitaiKey);

    // Only fetch if status is undefined (not yet initialized)
    if (civitaiKeyStatusSingleton === undefined) {
      fetchCivitaiKeyStatus();
    }

    // Cleanup listener on unmount
    return () => {
      listeners.delete(setHasValidCivitaiKey);
    };
  }, []);

  return { hasValidCivitaiKey, refreshCivitaiKeyStatus };
};
