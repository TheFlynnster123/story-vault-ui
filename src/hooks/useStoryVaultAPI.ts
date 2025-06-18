import { useAuth0 } from "@auth0/auth0-react";
import { StoryVaultAPI } from "../clients/StoryVaultAPI";
import { useEffect, useState } from "react";

export const useStoryVaultAPI = (): StoryVaultAPI | null => {
  const { getAccessTokenSilently } = useAuth0();
  const [storyVaultAPI, setStoryVaultAPI] = useState<StoryVaultAPI | null>(
    null
  );

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const api = new StoryVaultAPI(accessToken);
        setStoryVaultAPI(api);
      } catch (error) {
        console.error("Failed to get access token:", error);
        setStoryVaultAPI(null);
      }
    };

    fetchAccessToken();
  }, [getAccessTokenSilently]);

  return storyVaultAPI;
};
