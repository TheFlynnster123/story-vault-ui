import { useAuth0 } from "@auth0/auth0-react";
import { GrokChatAPI } from "../clients/GrokChatAPI";
import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    const initializeClient = async () => {
      if (isLoadingAuth) {
        // Wait for Auth0 to finish loading
        setIsLoadingClient(true);
        return;
      }

      if (!isAuthenticated) {
        console.warn(
          "[useGrokChatAPI] User is not authenticated. Cannot initialize GrokChatAPI client."
        );
        setGrokChatApiClient(null);
        setIsLoadingClient(false);
        // Optionally set an error or specific state if unauthenticated is an error for the hook's consumer
        // setClientError(new Error("User not authenticated."));
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
          setGrokChatApiClient(new GrokChatAPI(token));
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

    initializeClient();

    // Cleanup function or dependency array considerations:
    // If GrokChatAPI had a cleanup method (e.g., closing a persistent connection),
    // it could be called here. For the current simple fetch-based API, it's not strictly necessary.
    // Dependencies: isAuthenticated and getAccessTokenSilently.
    // getAccessTokenSilently is generally stable from useAuth0.
  }, [isAuthenticated, getAccessTokenSilently, isLoadingAuth]);

  return { grokChatApiClient, isLoadingClient, clientError };
}
