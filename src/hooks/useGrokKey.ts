import { useEffect, useState } from "react";
import { useStoryVaultAPI } from "./useStoryVaultAPI";

export const useGrokKey = () => {
  const storyVaultAPI = useStoryVaultAPI();
  const [hasValidGrokKey, setHasValidGrokKey] = useState<boolean | undefined>(
    undefined // Initialize as undefined to represent loading state
  );

  const refreshGrokKeyStatus = async () => {
    if (storyVaultAPI) {
      const isValid = await storyVaultAPI.hasValidGrokKey();
      setHasValidGrokKey(isValid);
    }
  };

  useEffect(() => {
    const checkGrokKey = async () => {
      refreshGrokKeyStatus();
    };

    checkGrokKey();
  }, [storyVaultAPI]);

  return { hasValidGrokKey, refreshGrokKeyStatus };
};
