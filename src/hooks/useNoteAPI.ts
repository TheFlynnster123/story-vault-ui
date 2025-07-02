import { useAuth0 } from "@auth0/auth0-react";
import { NoteAPI } from "../clients/NoteAPI";
import { useEffect, useState } from "react";
import { useEncryption } from "./useEncryption";

export const useNoteAPI = (): NoteAPI | undefined => {
  const { getAccessTokenSilently } = useAuth0();
  const { encryptionManager } = useEncryption();
  const [noteAPI, setStoryVaultAPI] = useState<NoteAPI | undefined>(undefined);

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        if (encryptionManager != undefined) {
          const api = new NoteAPI(encryptionManager, accessToken);
          setStoryVaultAPI(api);
        }
      } catch (error) {
        console.error("Failed to get access token:", error);
        setStoryVaultAPI(undefined);
      }
    };

    fetchAccessToken();
  }, [getAccessTokenSilently, encryptionManager]);

  return noteAPI;
};
