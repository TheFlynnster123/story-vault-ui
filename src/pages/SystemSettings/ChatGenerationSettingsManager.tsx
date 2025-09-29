import React, { useState, useEffect } from "react";
import { useSystemSettings } from "../../hooks/queries/useSystemSettings";
import type { ChatGenerationSettings } from "../../models";
import {
  Select,
  Slider,
  Button,
  Stack,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RiCheckboxCircleLine } from "react-icons/ri";

const MODEL_OPTIONS = [
  { value: "", label: "Default" },
  { value: "grok-4-0709", label: "grok-4-0709" },
  { value: "grok-4-fast-non-reasoning", label: "grok-4-fast-non-reasoning" },
  {
    value: "grok-4-fast-reasoning",
    label: "grok-4-fast-reasoning (Recommended!)",
  },
  { value: "grok-3", label: "grok-3" },
];

interface ChatGenerationSettingsManagerProps {
  onSave?: () => void;
}

export const ChatGenerationSettingsManager: React.FC<
  ChatGenerationSettingsManagerProps
> = ({ onSave }) => {
  const { systemSettings, saveSystemSettings, isLoading } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<ChatGenerationSettings>(
    {}
  );
  const [isDirty, setIsDirty] = useState(false);

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
    setLocalSettings((prev) => ({ ...prev, ...newSettings }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    await saveSystemSettings({
      ...systemSettings,
      chatGenerationSettings: localSettings,
    });
    setIsDirty(false);
    notifications.show({
      title: "Success",
      message: "Chat generation settings saved!",
      color: "green",
      icon: <RiCheckboxCircleLine />,
    });
    onSave?.();
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
    <Stack>
      <ModelSelect
        value={localSettings.model || ""}
        onChange={(value) => handleSettingChange({ model: value || undefined })}
      />
      <Button onClick={handleSave} mt="xl" disabled={!isDirty}>
        Save Settings
      </Button>
    </Stack>
  );
};

const ModelSelect: React.FC<{
  value: string | null;
  onChange: (value: string | null) => void;
}> = ({ value, onChange }) => (
  <Select
    label="Model"
    value={value}
    onChange={onChange}
    data={MODEL_OPTIONS}
    clearable
  />
);

const TemperatureSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => (
  <Stack gap="xs">
    <Text size="sm" fw={500}>
      Temperature
    </Text>
    <Slider
      value={value}
      onChange={onChange}
      variant="gradient"
      min={0}
      max={1.2}
      step={0.1}
      label={(v) => v.toFixed(1)}
      marks={TEMPERATURE_MARKS}
      m="sm"
    />
  </Stack>
);
