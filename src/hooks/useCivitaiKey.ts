import { useEffect, useState } from "react";
import { useCivitaiAPI } from "./useCivitaiAPI";

export const useCivitaiKey = () => {
  const civitaiAPI = useCivitaiAPI();
  const [hasValidCivitaiKey, setHasValidCivitaiKey] = useState<
    boolean | undefined
  >(
    undefined // Initialize as undefined to represent loading state
  );

  const refreshCivitaiKeyStatus = async () => {
    if (civitaiAPI) {
      try {
        const isValid = await civitaiAPI.hasValidCivitaiKey();
        setHasValidCivitaiKey(isValid);
      } catch (error) {
        console.error("Failed to check Civitai key status:", error);
        // Keep the current state on error, don't update it
      }
    }
  };

  useEffect(() => {
    if (civitaiAPI) {
      refreshCivitaiKeyStatus();
    }
  }, [civitaiAPI]);

  return { hasValidCivitaiKey, refreshCivitaiKeyStatus };
};
