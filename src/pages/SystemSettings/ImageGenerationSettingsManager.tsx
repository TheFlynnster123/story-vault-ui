import React, { useState } from "react";
import { useSystemSettings } from "../../hooks/queries/useSystemSettings";
import type { ImageGenerationSettings } from "../../models/SystemSettings";
import { ImageGenerator } from "../../Managers/ImageGenerator";
import "./ImageGenerationSettingsManager.css";

export const ImageGenerationSettingsManager: React.FC<{
  onSave?: () => void;
}> = ({ onSave }) => {
  const { systemSettings, saveSystemSettings } = useSystemSettings();
  const [settings, setSettings] = useState<ImageGenerationSettings>(
    systemSettings?.imageGenerationSettings || ImageGenerator.DEFAULT_SETTINGS
  );

  const [newNetworkURN, setNewNetworkURN] = useState("");
  const [newNetworkStrength, setNewNetworkStrength] = useState(0.8);

  const handleInputChange = (
    field: keyof ImageGenerationSettings["params"],
    value: string | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        [field]: value,
      },
    }));
  };

  const handleModelChange = (value: string) => {
    setSettings((prev) => ({ ...prev, model: value }));
  };

  const addAdditionalNetwork = () => {
    if (newNetworkURN) {
      setSettings((prev) => ({
        ...prev,
        additionalNetworks: {
          ...prev.additionalNetworks,
          [newNetworkURN]: { strength: newNetworkStrength },
        },
      }));
      setNewNetworkURN("");
      setNewNetworkStrength(0.8);
    }
  };

  const removeAdditionalNetwork = (urn: string) => {
    setSettings((prev) => {
      const { [urn]: _, ...rest } = prev.additionalNetworks;
      return { ...prev, additionalNetworks: rest };
    });
  };

  const updateNetworkStrength = (urn: string, strength: number) => {
    setSettings((prev) => ({
      ...prev,
      additionalNetworks: {
        ...prev.additionalNetworks,
        [urn]: { strength },
      },
    }));
  };

  const handleSave = () => {
    saveSystemSettings({
      ...systemSettings,
      imageGenerationSettings: settings,
    });
    if (onSave) onSave();
  };

  return (
    <div className="image-generation-settings">
      <h4>Model</h4>
      <input
        type="text"
        value={settings.model}
        onChange={(e) => handleModelChange(e.target.value)}
      />

      <h4>Parameters</h4>
      <label>Base Prompt</label>
      <textarea
        value={settings.params.prompt}
        onChange={(e) => handleInputChange("prompt", e.target.value)}
      />

      <label>Negative Prompt</label>
      <textarea
        value={settings.params.negativePrompt}
        onChange={(e) => handleInputChange("negativePrompt", e.target.value)}
      />

      <label>Scheduler</label>
      <input
        type="text"
        value={settings.params.scheduler}
        onChange={(e) => handleInputChange("scheduler", e.target.value)}
      />

      <label>Steps</label>
      <input
        type="number"
        value={settings.params.steps}
        onChange={(e) => handleInputChange("steps", parseInt(e.target.value))}
      />

      <label>CFG Scale</label>
      <input
        type="number"
        value={settings.params.cfgScale}
        onChange={(e) =>
          handleInputChange("cfgScale", parseFloat(e.target.value))
        }
      />

      <label>Width</label>
      <input
        type="number"
        value={settings.params.width}
        onChange={(e) => handleInputChange("width", parseInt(e.target.value))}
      />

      <label>Height</label>
      <input
        type="number"
        value={settings.params.height}
        onChange={(e) => handleInputChange("height", parseInt(e.target.value))}
      />

      <label>Clip Skip</label>
      <input
        type="number"
        value={settings.params.clipSkip}
        onChange={(e) =>
          handleInputChange("clipSkip", parseInt(e.target.value))
        }
      />

      <div className="additional-networks-section">
        <h4>Additional Networks</h4>
        {Object.entries(settings.additionalNetworks).map(
          ([urn, { strength }]) => (
            <div key={urn} className="network-item">
              <span>{urn}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={strength}
                onChange={(e) =>
                  updateNetworkStrength(urn, parseFloat(e.target.value))
                }
              />
              <span>{strength}</span>
              <button onClick={() => removeAdditionalNetwork(urn)}>❌</button>
            </div>
          )
        )}

        <div className="add-network">
          <input
            type="text"
            placeholder="URN"
            value={newNetworkURN}
            onChange={(e) => setNewNetworkURN(e.target.value)}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={newNetworkStrength}
            onChange={(e) => setNewNetworkStrength(parseFloat(e.target.value))}
          />
          <span>{newNetworkStrength}</span>
          <button onClick={addAdditionalNetwork}>➕</button>
        </div>
      </div>

      <button className="save-button" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
};
