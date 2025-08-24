import React, { useState } from "react";
import { useSystemSettings } from "../../hooks/queries/useSystemSettings";
import type { ImageGenerationSettings } from "../../models/ImageGenerationSettings";
import { ImageGenerator } from "../../Managers/ImageGenerator";
import {
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Group,
  Title,
  Paper,
  Slider,
  ActionIcon,
  Stack,
  Box,
  Text,
} from "@mantine/core";
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri";

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
    <Stack>
      <TextInput
        label="Model"
        value={settings.model}
        onChange={(e) => handleModelChange(e.target.value)}
      />

      <Title order={4}>Parameters</Title>
      <Textarea
        label="Base Prompt"
        value={settings.params.prompt}
        onChange={(e) => handleInputChange("prompt", e.target.value)}
        autosize
        minRows={3}
      />
      <Textarea
        label="Negative Prompt"
        value={settings.params.negativePrompt}
        onChange={(e) => handleInputChange("negativePrompt", e.target.value)}
        autosize
        minRows={3}
      />
      <TextInput
        label="Scheduler"
        value={settings.params.scheduler}
        onChange={(e) => handleInputChange("scheduler", e.target.value)}
      />
      <Group grow>
        <NumberInput
          label="Steps"
          value={settings.params.steps}
          onChange={(value) => handleInputChange("steps", value || 0)}
        />
        <NumberInput
          label="CFG Scale"
          value={settings.params.cfgScale}
          onChange={(value) => handleInputChange("cfgScale", value || 0)}
          step={0.1}
        />
      </Group>
      <Group grow>
        <NumberInput
          label="Width"
          value={settings.params.width}
          onChange={(value) => handleInputChange("width", value || 0)}
        />
        <NumberInput
          label="Height"
          value={settings.params.height}
          onChange={(value) => handleInputChange("height", value || 0)}
        />
      </Group>
      <NumberInput
        label="Clip Skip"
        value={settings.params.clipSkip}
        onChange={(value) => handleInputChange("clipSkip", value || 0)}
      />

      <Paper withBorder p="md" mt="md">
        <Title order={4} mb="sm">
          Additional Networks
        </Title>
        <Stack>
          {Object.entries(settings.additionalNetworks).map(
            ([urn, { strength }]) => (
              <Paper withBorder p="sm" radius="sm" key={urn}>
                <Group>
                  <Text size="sm" style={{ flex: 1 }}>
                    {urn}
                  </Text>
                  <Slider
                    value={strength}
                    onChange={(value) => updateNetworkStrength(urn, value)}
                    min={0}
                    max={1}
                    step={0.1}
                    label={(value) => value.toFixed(1)}
                    style={{ flex: 2 }}
                  />
                  <ActionIcon
                    color="red"
                    onClick={() => removeAdditionalNetwork(urn)}
                  >
                    <RiDeleteBinLine />
                  </ActionIcon>
                </Group>
              </Paper>
            )
          )}
        </Stack>

        <Box mt="md">
          <Group>
            <TextInput
              placeholder="URN"
              value={newNetworkURN}
              onChange={(e) => setNewNetworkURN(e.target.value)}
              style={{ flex: 1 }}
            />
            <Slider
              value={newNetworkStrength}
              onChange={setNewNetworkStrength}
              min={0}
              max={1}
              step={0.1}
              label={(value) => value.toFixed(1)}
              style={{ flex: 2 }}
            />
            <ActionIcon color="blue" onClick={addAdditionalNetwork}>
              <RiAddLine />
            </ActionIcon>
          </Group>
        </Box>
      </Paper>

      <Button onClick={handleSave} mt="xl">
        Save Settings
      </Button>
    </Stack>
  );
};
