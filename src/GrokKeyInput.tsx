import { useState } from "react";
import { EncryptionManager } from "./Managers/EncryptionManager";
import { GrokKeyAPI } from "./clients/GrokKeyAPI";

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
    } catch (error) {
      console.error("Failed to save Grok key:", error);
      alert("Failed to save Grok key. Please try again.");
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
