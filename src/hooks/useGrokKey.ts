import { useEffect, useState } from "react";
import { GrokKeyAPI } from "../clients/GrokKeyAPI";

export const useGrokKey = () => {
  const [hasValidGrokKey, setHasValidGrokKey] = useState<boolean | undefined>(
    undefined // Initialize as undefined to represent loading state
  );

  const refreshGrokKeyStatus = async () => {
    const isValid = await new GrokKeyAPI().hasValidGrokKey();
    setHasValidGrokKey(isValid);
  };

  useEffect(() => {
    const checkGrokKey = async () => {
      refreshGrokKeyStatus();
    };

    checkGrokKey();
  }, []);

  return { hasValidGrokKey, refreshGrokKeyStatus };
};
