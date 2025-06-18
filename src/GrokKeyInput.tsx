import { useState } from "react";
import { useStoryVaultAPI } from "./hooks/useStoryVaultAPI";

interface IGrokKeyInput {
  onGrokKeyUpdated: () => void;
}

export const GrokKeyInput: React.FC<IGrokKeyInput> = ({ onGrokKeyUpdated }) => {
  const [grokKey, setGrokKey] = useState<string>("");
  const storyVaultAPI = useStoryVaultAPI();

  const saveGrokKey = () => {
    storyVaultAPI
      ?.saveGrokKey(grokKey)
      .then(() => {
        onGrokKeyUpdated();
      })
      .catch((error) => {
        console.error("Failed to save Grok key:", error);
        alert("Failed to save Grok key. Please try again.");
      });
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
      {storyVaultAPI ? (
        <button onClick={saveGrokKey}>Submit</button>
      ) : (
        <button disabled={true}>Submit</button>
      )}
    </>
  );
};
