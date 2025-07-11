import { useAuth0 } from "@auth0/auth0-react";
import { GrokKeyAPI } from "../clients/StoryVaultAPI";
import { useEffect, useState } from "react";

export const useStoryVaultAPI = (): GrokKeyAPI | null => {
  const { getAccessTokenSilently } = useAuth0();
  const [storyVaultAPI, setStoryVaultAPI] = useState<GrokKeyAPI | null>(null);

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const api = new GrokKeyAPI(accessToken);
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
