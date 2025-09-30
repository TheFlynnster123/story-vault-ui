import { useEffect, useState } from "react";
import { CivitKeyAPI } from "../clients/CivitKeyAPI";
import { d } from "../app/Dependencies/Dependencies";

export const useCivitaiKey = () => {
  const [hasValidCivitaiKey, setHasValidCivitaiKey] = useState<
    boolean | undefined
  >(undefined);

  const refreshCivitaiKeyStatus = async () => {
    try {
      const isValid = await new CivitKeyAPI().hasValidCivitaiKey();
      setHasValidCivitaiKey(isValid);
    } catch (e) {
      d.ErrorService().log("Failed to check Civitai key status", e);
    }
  };

  useEffect(() => {
    refreshCivitaiKeyStatus();
  }, []);

  return { hasValidCivitaiKey, refreshCivitaiKeyStatus };
};
