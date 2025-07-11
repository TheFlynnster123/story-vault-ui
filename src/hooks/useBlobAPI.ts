import { useAuth0 } from "@auth0/auth0-react";
import { BlobAPI } from "../clients/BlobAPI";
import { useEffect, useState } from "react";
import { useEncryption } from "./useEncryption";

export const useBlobAPI = (): BlobAPI | undefined => {
  const { getAccessTokenSilently } = useAuth0();
  const { encryptionManager } = useEncryption();
  const [blobAPI, setBlobAPI] = useState<BlobAPI | undefined>(undefined);

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        if (encryptionManager != undefined) {
          const api = new BlobAPI(encryptionManager, accessToken);
          setBlobAPI(api);
        }
      } catch (error) {
        console.error("Failed to get access token:", error);
        setBlobAPI(undefined);
      }
    };

    fetchAccessToken();
  }, [getAccessTokenSilently, encryptionManager]);

  return blobAPI;
};
