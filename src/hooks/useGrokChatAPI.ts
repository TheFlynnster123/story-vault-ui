import { useAuth0 } from "@auth0/auth0-react";
import { GrokChatAPI } from "../clients/GrokChatAPI";
import { useEffect, useState } from "react";
import { useEncryption } from "./useEncryption";
import type { EncryptionManager } from "../Managers/EncryptionManager";

export interface UseGrokChatAPIResult {
  grokChatApiClient: GrokChatAPI | null;
  isLoadingClient: boolean;
  clientError: Error | null;
}

export function useGrokChatAPI(): UseGrokChatAPIResult {
  const {
    getAccessTokenSilently,
    isAuthenticated,
    isLoading: isLoadingAuth,
  } = useAuth0();
  const [grokChatApiClient, setGrokChatApiClient] =
    useState<GrokChatAPI | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState<boolean>(true);
  const [clientError, setClientError] = useState<Error | null>(null);
  const { encryptionManager } = useEncryption();

  useEffect(() => {
    const initializeClient = async () => {
      if (isLoadingAuth) {
        setIsLoadingClient(true);
        return;
      }

      if (!isAuthenticated) {
        console.warn(
          "[useGrokChatAPI] User is not authenticated. Cannot initialize GrokChatAPI client."
        );
        setGrokChatApiClient(null);
        setIsLoadingClient(false);
        return;
      }

      setIsLoadingClient(true);
      setClientError(null);
      try {
        const token = await getAccessTokenSilently();
        if (!token) {
          console.error(
            "[useGrokChatAPI] Failed to retrieve access token silently."
          );
          setClientError(new Error("Failed to retrieve access token."));
          setGrokChatApiClient(null);
        } else {
          setGrokChatApiClient(
            new GrokChatAPI(encryptionManager as EncryptionManager, token)
          );
        }
      } catch (error: any) {
        console.error(
          "[useGrokChatAPI] Error getting access token or instantiating GrokChatAPI:",
          error
        );
        setClientError(
          error instanceof Error ? error : new Error(String(error))
        );
        setGrokChatApiClient(null);
      } finally {
        setIsLoadingClient(false);
      }
    };

    if (encryptionManager) initializeClient();
  }, [
    isAuthenticated,
    getAccessTokenSilently,
    isLoadingAuth,
    encryptionManager,
  ]);

  return { grokChatApiClient, isLoadingClient, clientError };
}
