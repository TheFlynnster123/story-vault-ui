import { useState } from "react";
import { EncryptionManager } from "./Managers/EncryptionManager";
import { GrokKeyAPI } from "./clients/GrokKeyAPI";
import { d } from "./app/Dependencies/Dependencies";

interface IGrokKeyInput {
  onGrokKeyUpdated: () => void;
}

export const GrokKeyInput: React.FC<IGrokKeyInput> = ({ onGrokKeyUpdated }) => {
  const [grokKey, setGrokKey] = useState<string>("");

  const saveGrokKey = async () => {
    try {
      const encryptionManager = new EncryptionManager();
      await encryptionManager.ensureKeysInitialized();

      const encryptedKey = await encryptionManager.encryptString(
        encryptionManager.grokEncryptionKey as string,
        grokKey
      );

      await new GrokKeyAPI().saveGrokKey(encryptedKey);

      onGrokKeyUpdated();
    } catch (e) {
      d.ErrorService().log("Failed to save Grok key", e as Error);
    }
  };

  return (
    <>
      <p>Please provide a valid Grok Key to continue.</p>
      <input
        className="m-1"
        type="text"
        value={grokKey}
        onChange={(e) => setGrokKey(e.target.value)}
        placeholder="Enter Grok Key"
      />
      <button onClick={saveGrokKey}>Submit</button>
    </>
  );
};
