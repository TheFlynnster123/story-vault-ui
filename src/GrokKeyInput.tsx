import { useState } from "react";
import { d } from "./app/Dependencies/Dependencies";

interface IGrokKeyInput {
  onGrokKeyUpdated: () => void;
}

export const GrokKeyInput: React.FC<IGrokKeyInput> = ({ onGrokKeyUpdated }) => {
  const [grokKey, setGrokKey] = useState<string>("");

  const saveGrokKey = async () => {
    try {
      const encryptedKey = await d
        .EncryptionManager()
        .encryptString("grok", grokKey);

      await d.GrokKeyAPI().saveGrokKey(encryptedKey);

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
