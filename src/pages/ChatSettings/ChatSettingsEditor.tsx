import React, { useState, useEffect } from "react";
import { useSystemSettings } from "../../queries/system-settings/useSystemSettings";
import type { ChatGenerationSettings } from "../../models";
import { Select, Button, Stack, Text, Group, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RiCheckboxCircleLine } from "react-icons/ri";

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

interface IChatSettingsEditor {
  onSave?: () => void;
}

export const ChatSettingsEditor: React.FC<IChatSettingsEditor> = ({
  onSave,
}) => {
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
