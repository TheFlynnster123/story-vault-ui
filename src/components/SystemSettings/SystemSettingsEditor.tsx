import React, { useState, useEffect } from "react";
import { useSystemSettings } from "./useSystemSettings";
import { Group, Loader, Text } from "@mantine/core";
import type { ChatGenerationSettings } from "../../services/System/SystemSettings";
import { d } from "../../services/Dependencies";
import { ModelSelect } from "../AI/ModelSelect";

export const SystemSettingsEditor: React.FC = () => {
  const { systemSettings, isLoading } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<ChatGenerationSettings>(
    {}
  );

  useEffect(() => {
    if (systemSettings?.chatGenerationSettings) {
      setLocalSettings({
        ...systemSettings.chatGenerationSettings,
      });
    }
  }, [systemSettings]);

  const handleSettingChange = (
    newSettings: Partial<ChatGenerationSettings>
  ) => {
    const updatedSettings = { ...localSettings, ...newSettings };
    setLocalSettings(updatedSettings);

    d.SystemSettingsService().SaveDebounced({
      ...systemSettings,
      chatGenerationSettings: updatedSettings,
    });
  };

  if (isLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text>Loading settings...</Text>
      </Group>
    );
  }

  return (
    <ModelSelect
      value={localSettings.model || ""}
      onChange={(value) => handleSettingChange({ model: value || undefined })}
      withDescription
    />
  );
};
