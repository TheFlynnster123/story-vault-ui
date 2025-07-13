import { useEffect, useState } from "react";
import { CivitKeyAPI } from "../clients/CivitKeyAPI";

export const useCivitaiKey = () => {
  const [hasValidCivitaiKey, setHasValidCivitaiKey] = useState<
    boolean | undefined
  >(undefined);

  const refreshCivitaiKeyStatus = async () => {
    try {
      const isValid = await new CivitKeyAPI().hasValidCivitaiKey();
      setHasValidCivitaiKey(isValid);
    } catch (error) {
      console.error("Failed to check Civitai key status:", error);
    }
  };

  useEffect(() => {
    refreshCivitaiKeyStatus();
  }, []);

  return { hasValidCivitaiKey, refreshCivitaiKeyStatus };
};
