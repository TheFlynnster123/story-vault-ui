import React, { useState } from "react";
import { useGrokKey } from "../hooks/useGrokKey";
import "./GrokKeyManager.css";
import { EncryptionManager } from "../Managers/EncryptionManager";
import { GrokKeyAPI } from "../clients/GrokKeyAPI";

export const GrokKeyManager: React.FC = () => {
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [grokKey, setGrokKey] = useState("");
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
    setGrokKey("");
    setUpdateMessage(null);
  };

  const handleSaveKey = async () => {
    if (!grokKey.trim()) {
      setUpdateMessage({
        type: "error",
        text: "Please enter a valid Grok key",
      });
      return;
    }

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const encryptionManager = new EncryptionManager();
      await encryptionManager.ensureKeysInitialized();

      const encryptedKey = await encryptionManager.encryptString(
        encryptionManager.grokEncryptionKey as string,
        grokKey
      );

      await new GrokKeyAPI().saveGrokKey(encryptedKey);

      // Refresh the key status
      await refreshGrokKeyStatus();

      setUpdateMessage({
        type: "success",
        text: "Grok key updated successfully!",
      });

      setGrokKey("");
      setShowKeyInput(false);
    } catch (error) {
      console.error("Failed to save Grok key:", error);
      setUpdateMessage({
        type: "error",
        text: "Failed to save Grok key. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = () => {
    if (hasValidGrokKey === undefined) {
      return <span className="grok-status-loading">⟳</span>;
    }
    return hasValidGrokKey ? (
      <span className="grok-status-valid">✓</span>
    ) : (
      <span className="grok-status-invalid">✗</span>
    );
  };

  const getStatusText = () => {
    if (hasValidGrokKey === undefined) {
      return "Checking key status...";
    }
    return hasValidGrokKey
      ? "Valid Grok key configured"
      : "No valid Grok key found";
  };

  return (
    <div className="grok-key-manager">
      <div className="grok-status-display">
        <div className="grok-status-info">
          {getStatusIcon()}
          <span className="grok-status-text">{getStatusText()}</span>
        </div>

        {!showKeyInput && (
          <button
            className="grok-update-button"
            onClick={handleUpdateKeyClick}
            disabled={hasValidGrokKey === undefined}
          >
            {hasValidGrokKey ? "Update Key" : "Add Key"}
          </button>
        )}
      </div>

      {showKeyInput && (
        <div className="grok-key-input-section">
          <div className="grok-input-group">
            <label htmlFor="grok-key-input" className="grok-input-label">
              Enter your Grok API key:
            </label>
            <input
              id="grok-key-input"
              type="password"
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              placeholder="Enter Grok API key..."
              className="grok-key-input"
              disabled={isUpdating}
            />
          </div>

          <div className="grok-input-actions">
            <button
              className="grok-cancel-button"
              onClick={handleCancelUpdate}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              className="grok-save-button"
              onClick={handleSaveKey}
              disabled={isUpdating || !grokKey.trim()}
            >
              {isUpdating ? "Saving..." : "Save Key"}
            </button>
          </div>
        </div>
      )}

      {updateMessage && (
        <div className={`grok-update-message ${updateMessage.type}`}>
          {updateMessage.text}
        </div>
      )}
    </div>
  );
};
