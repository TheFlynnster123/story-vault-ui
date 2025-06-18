import { useEffect, useState } from "react";
import { useStoryVaultAPI } from "./useStoryVaultAPI";

export const useGrokKey = () => {
  const storyVaultAPI = useStoryVaultAPI();
  const [hasValidGrokKey, setHasValidGrokKey] = useState<boolean | undefined>(
    false
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
