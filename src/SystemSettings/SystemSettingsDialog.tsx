import React, { useEffect } from "react";
import { GrokKeyManager } from "./GrokKeyManager";
import { CivitaiKeyManager } from "./CivitaiKeyManager";
import { ChatGenerationSettingsManager } from "./ChatGenerationSettingsManager";
import { ImageGenerationSettingsManager } from "./ImageGenerationSettingsManager";
import "./SystemSettingsDialog.css";

interface SystemSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemSettingsDialog: React.FC<SystemSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="system-settings-overlay" onClick={handleOverlayClick}>
      <div className="system-settings-dialog">
        <div className="system-settings-header">
          <h2>System Settings</h2>
          <button
            className="system-settings-close-button"
            onClick={onClose}
            aria-label="Close system settings"
          >
            ×
          </button>
        </div>

        <div className="system-settings-content">
          <div className="system-settings-section">
            <h3>Chat Generation Settings</h3>
            <ChatGenerationSettingsManager onSave={onClose} />
          </div>

          <div className="system-settings-section">
            <h3>Grok API Configuration</h3>
            <GrokKeyManager />
          </div>

          <div className="system-settings-section">
            <h3>Civitai API Configuration</h3>
            <CivitaiKeyManager />
          </div>

          <div className="system-settings-section">
            <h3>Image Generation Settings</h3>
            <ImageGenerationSettingsManager onSave={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};
