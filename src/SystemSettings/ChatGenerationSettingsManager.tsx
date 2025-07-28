import React, { useState, useEffect } from "react";
import { useSystemSettings } from "../hooks/queries/useSystemSettings";
import type { ChatGenerationSettings } from "../models";

const DEFAULT_TEMPERATURE = 0.7;

interface ChatGenerationSettingsManagerProps {
  onSave?: () => void;
}

export const ChatGenerationSettingsManager: React.FC<
  ChatGenerationSettingsManagerProps
> = ({ onSave }) => {
  const { systemSettings, saveSystemSettings, isLoading } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<ChatGenerationSettings>({
    temperature: DEFAULT_TEMPERATURE,
  });

  useEffect(() => {
    if (systemSettings?.chatGenerationSettings) {
      setLocalSettings({
        temperature: DEFAULT_TEMPERATURE,
        ...systemSettings.chatGenerationSettings,
      });
    }
  }, [systemSettings]);

  const handleSave = async () => {
    await saveSystemSettings({
      ...systemSettings,
      chatGenerationSettings: localSettings,
    });
    onSave?.();
  };

  const handleReasoningEffortChange = (value: "high" | "low" | "") => {
    setLocalSettings((prev) => ({
      ...prev,
      reasoningEffort: value === "" ? undefined : value,
    }));
  };

  const handleModelChange = (value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      model: value === "" ? undefined : value,
    }));
  };

  const handleTemperatureChange = (value: number) => {
    setLocalSettings((prev) => ({
      ...prev,
      temperature: value,
    }));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-generation-settings">
      <div className="setting-group">
        <label htmlFor="reasoning-effort">Reasoning Effort:</label>
        <select
          id="reasoning-effort"
          value={localSettings.reasoningEffort || ""}
          onChange={(e) =>
            handleReasoningEffortChange(e.target.value as "high" | "low" | "")
          }
        >
          <option value="">Default</option>
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="setting-group">
        <label htmlFor="model">Model:</label>
        <select
          id="model"
          value={localSettings.model || ""}
          onChange={(e) => handleModelChange(e.target.value)}
        >
          <option value="">Default</option>
          <option value="grok-4-0709">grok-4-0709</option>
          <option value="grok-3-mini">grok-3-mini (Recommended!)</option>
          <option value="grok-3-mini-fast">grok-3-mini-fast</option>
          <option value="grok-3">grok-3</option>
          <option value="grok-3-fast">grok-3-fast</option>
        </select>
      </div>

      <div className="setting-group">
        <label htmlFor="temperature">Temperature (default: 0.8):</label>
        <div className="temperature-slider-container">
          <div className="temperature-labels">
            <span>Precise</span>
            <span>Creative (0.7)</span>
            <span>Incoherent</span>
          </div>
          <input
            id="temperature"
            type="range"
            min="0"
            max="1.2"
            step="0.1"
            value={localSettings.temperature ?? DEFAULT_TEMPERATURE}
            onChange={(e) =>
              handleTemperatureChange(parseFloat(e.target.value))
            }
          />
          <div className="temperature-value">
            {(localSettings.temperature ?? DEFAULT_TEMPERATURE).toFixed(1)}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="save-button">
        Save Settings
      </button>
    </div>
  );
};
