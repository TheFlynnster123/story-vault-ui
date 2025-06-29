import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { EncryptionManager } from "../Managers/EncryptionManager";

export const useEncryption = () => {
  const { isAuthenticated, getIdTokenClaims } = useAuth0();
  const [encryptionManager, setEncryptionManager] =
    useState<EncryptionManager>();

  useEffect(() => {
    const getManager = async () => {
      if (isAuthenticated) {
        const claims = await getIdTokenClaims();
        const encryptionGuid =
          claims?.["https://story-vault-api.com/encryption_guid"];

        if (encryptionGuid) {
          const manager = new EncryptionManager(encryptionGuid);
          await manager.initialize();
          setEncryptionManager(manager);
        }
      }
    };

    getManager();
  }, [isAuthenticated, getIdTokenClaims]);

  return { encryptionManager };
};
