import { useAuth0 } from "@auth0/auth0-react";
import { useEncryption } from "./useEncryption";
import { useEffect, useState } from "react";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import type { EncryptionManager } from "../Managers/EncryptionManager";

export const useChatHistoryApi = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { encryptionManager } = useEncryption();
  const [chatHistoryApi, setChatHistoryApi] = useState<ChatHistoryAPI | null>(
    null
  );

  useEffect(() => {
    const initializeApi = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        setChatHistoryApi(
          new ChatHistoryAPI(
            encryptionManager as EncryptionManager,
            accessToken
          )
        );
      } catch (error) {
        console.error("Failed to initialize ChatHistoryAPI:", error);
        setChatHistoryApi(null);
      }
    };

    if (encryptionManager) initializeApi();
  }, [getAccessTokenSilently, encryptionManager]);

  return chatHistoryApi;
};
