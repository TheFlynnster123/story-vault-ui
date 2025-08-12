import React, { useState } from "react";
import { useCivitaiKey } from "../../hooks/useCivitaiKey";
import "./CivitaiKeyManager.css";
import { EncryptionManager } from "../../Managers/EncryptionManager";
import { CivitKeyAPI } from "../../clients/CivitKeyAPI";

export const CivitaiKeyManager: React.FC = () => {
  const { hasValidCivitaiKey, refreshCivitaiKeyStatus } = useCivitaiKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [civitaiKey, setCivitaiKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdateKeyClick = () => {
    setShowKeyInput(true);
    setUpdateMessage(null);
  };

  const handleCancelUpdate = () => {
    setShowKeyInput(false);
    setCivitaiKey("");
    setUpdateMessage(null);
  };

  const handleSaveKey = async () => {
    if (!civitaiKey.trim()) {
      setUpdateMessage({
        type: "error",
        text: "Please enter a valid Civitai key",
      });
      return;
    }

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const encryptionManager = new EncryptionManager();
      await encryptionManager.ensureKeysInitialized();

      const encryptedKey = await encryptionManager.encryptString(
        encryptionManager.civitaiEncryptionKey as string,
        civitaiKey
      );

      await new CivitKeyAPI().saveCivitaiKey(encryptedKey);

      await refreshCivitaiKeyStatus();

      setUpdateMessage({
        type: "success",
        text: "Civitai key updated successfully!",
      });

      setCivitaiKey("");
      setShowKeyInput(false);
    } catch (error) {
      console.error("Failed to save Civitai key:", error);
      setUpdateMessage({
        type: "error",
        text: "Failed to save Civitai key. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (hasValidCivitaiKey === undefined) {
      return <span className="civitai-status-loading">⟳</span>;
    }
    return hasValidCivitaiKey ? (
      <span className="civitai-status-valid">✓</span>
    ) : (
      <span className="civitai-status-invalid">✗</span>
    );
  };

  const getStatusText = () => {
    if (hasValidCivitaiKey === undefined) {
      return "Checking key status...";
    }
    return hasValidCivitaiKey
      ? "Valid Civitai key configured"
      : "No valid Civitai key found";
  };

  return (
    <div className="civitai-key-manager">
      <div className="civitai-status-display">
        <div className="civitai-status-info">
          {getStatusIcon()}
          <span className="civitai-status-text">{getStatusText()}</span>
        </div>

        {!showKeyInput && (
          <button
            className="civitai-update-button"
            onClick={handleUpdateKeyClick}
            disabled={hasValidCivitaiKey === undefined}
          >
            {hasValidCivitaiKey ? "Update Key" : "Add Key"}
          </button>
        )}
      </div>

      {showKeyInput && (
        <div className="civitai-key-input-section">
          <div className="civitai-input-group">
            <label htmlFor="civitai-key-input" className="civitai-input-label">
              Enter your Civitai API key:
            </label>
            <input
              id="civitai-key-input"
              type="password"
              value={civitaiKey}
              onChange={(e) => setCivitaiKey(e.target.value)}
              placeholder="Enter Civitai API key..."
              className="civitai-key-input"
              disabled={isUpdating}
            />
          </div>

          <div className="civitai-input-actions">
            <button
              className="civitai-cancel-button"
              onClick={handleCancelUpdate}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              className="civitai-save-button"
              onClick={handleSaveKey}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Key"}
            </button>
          </div>
        </div>
      )}

      {updateMessage && (
        <div className={`civitai-update-message ${updateMessage.type}`}>
          {updateMessage.text}
        </div>
      )}
    </div>
  );
};
