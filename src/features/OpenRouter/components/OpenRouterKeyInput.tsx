import { useState } from "react";
import { d } from "../../../services/Dependencies";

interface IOpenRouterKeyInput {
  onOpenRouterKeyUpdated: () => void;
}

export const OpenRouterKeyInput: React.FC<IOpenRouterKeyInput> = ({
  onOpenRouterKeyUpdated,
}) => {
  const [openRouterKey, setOpenRouterKey] = useState<string>("");

  const saveOpenRouterKey = async () => {
    try {
      const encryptedKey = await d
        .EncryptionManager()
        .encryptString("openrouter", openRouterKey);

      await d.OpenRouterKeyAPI().saveOpenRouterKey(encryptedKey);

      onOpenRouterKeyUpdated();
    } catch (e) {
      d.ErrorService().log("Failed to save OpenRouter key", e as Error);
    }
  };

  return (
    <>
      <p>Please provide a valid OpenRouter Key to continue.</p>
      <input
        className="m-1"
        type="text"
        value={openRouterKey}
        onChange={(e) => setOpenRouterKey(e.target.value)}
        placeholder="Enter OpenRouter Key"
      />
      <button onClick={saveOpenRouterKey}>Submit</button>
    </>
  );
};
