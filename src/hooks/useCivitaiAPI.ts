import { useAuth0 } from "@auth0/auth0-react";
import { CivitaiAPI } from "../clients/CivitaiAPI";
import { useEffect, useState } from "react";

export const useCivitaiAPI = (): CivitaiAPI | null => {
  const { getAccessTokenSilently } = useAuth0();
  const [civitaiAPI, setCivitaiAPI] = useState<CivitaiAPI | null>(null);

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const api = new CivitaiAPI(accessToken);
        setCivitaiAPI(api);
      } catch (error) {
        console.error("Failed to get access token:", error);
        setCivitaiAPI(null);
      }
    };

    fetchAccessToken();
  }, [getAccessTokenSilently]);

  return civitaiAPI;
};
