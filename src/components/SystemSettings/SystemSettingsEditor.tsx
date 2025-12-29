import React, { useState, useEffect } from "react";
import { useSystemSettings } from "./useSystemSettings";
import { Select, Stack, Text, Group, Loader } from "@mantine/core";
import type { ChatGenerationSettings } from "../../services/System/SystemSettings";
import { d } from "../../services/Dependencies";

const MODEL_OPTIONS = [
  { value: "", label: "Default" },
  { value: "grok-4-0709", label: "grok-4-0709" },
  { value: "grok-4-1-fast-reasoning", label: "grok-4-1-fast-reasoning" },
  { value: "grok-4-fast-non-reasoning", label: "grok-4-fast-non-reasoning" },
  {
    value: "grok-4-fast-reasoning",
    label: "grok-4-fast-reasoning (Recommended!)",
  },
  { value: "grok-3", label: "grok-3" },
];

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
    />
  );
};

const ModelSelect: React.FC<{
  value: string | null;
  onChange: (value: string | null) => void;
}> = ({ value, onChange }) => (
  <Stack gap="xs">
    <Select
      label="Model"
      value={value}
      onChange={onChange}
      data={MODEL_OPTIONS}
      clearable
    />
    <Text size="sm" c="dimmed">
      Select which Grok model to use for chat generation. Different models offer
      varying levels of speed and reasoning capabilities. Leave empty to use the
      default model.
    </Text>
  </Stack>
);
