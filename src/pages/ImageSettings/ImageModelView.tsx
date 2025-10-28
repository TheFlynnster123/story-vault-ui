import React, { useState } from "react";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import type { FromTextInput } from "civitai/dist/types/Inputs";
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
  Collapse,
  Badge,
} from "@mantine/core";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
} from "react-icons/ri";
import { SchedulerCombobox } from "./SchedulerCombobox";
import { SampleImageGenerator } from "./SampleImageGenerator";
import { ModelFromImage } from "./ModelFromImage";

interface ImageModelViewProps {
  model: ImageModel;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSelect: () => void;
  onSave: (model: ImageModel) => void;
  onDelete: () => void;
}

export const ImageModelView: React.FC<ImageModelViewProps> = ({
  model,
  isSelected,
  isExpanded,
  onToggleExpanded,
  onSelect,
  onSave,
  onDelete,
}) => {
  const [localModel, setLocalModel] = useState<ImageModel>(model);
  const [newNetworkURN, setNewNetworkURN] = useState("");
  const [newNetworkStrength, setNewNetworkStrength] = useState(0.8);

  React.useEffect(() => {
    setLocalModel(model);
  }, [model]);

  const handleInputChange = (
    field: keyof FromTextInput["params"],
    value: string | number
  ) => {
    setLocalModel((prev) => ({
      ...prev,
      input: {
        ...prev.input,
        params: {
          ...prev.input.params,
          [field]: value,
        },
      },
    }));
  };

  const handleModelChange = (value: string) => {
    setLocalModel((prev) => ({
      ...prev,
      input: {
        ...prev.input,
        model: value,
      },
    }));
  };

  const addAdditionalNetwork = () => {
    if (newNetworkURN) {
      setLocalModel((prev) => ({
        ...prev,
        input: {
          ...prev.input,
          additionalNetworks: {
            ...prev.input.additionalNetworks,
            [newNetworkURN]: { strength: newNetworkStrength },
          },
        },
      }));
      setNewNetworkURN("");
      setNewNetworkStrength(0.8);
    }
  };

  const removeAdditionalNetwork = (urn: string) => {
    setLocalModel((prev) => {
      const { [urn]: _, ...rest } = prev.input.additionalNetworks || {};
      return {
        ...prev,
        input: {
          ...prev.input,
          additionalNetworks: rest,
        },
      };
    });
  };

  const updateNetworkStrength = (urn: string, strength: number) => {
    setLocalModel((prev) => ({
      ...prev,
      input: {
        ...prev.input,
        additionalNetworks: {
          ...prev.input.additionalNetworks,
          [urn]: { strength },
        },
      },
    }));
  };

  const handleSave = () => {
    onSave(localModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    setLocalModel((prev) => ({
      ...prev,
      name: loadedModel.name,
      input: {
        model: loadedModel.input.model,
        params: {
          ...loadedModel.input.params,
        },
        additionalNetworks: loadedModel.input.additionalNetworks || {},
      },
    }));
  };

  return (
    <Paper withBorder p="md" mb="md">
      <Group mb="sm">
        <ActionIcon variant="subtle" onClick={onToggleExpanded} size="sm">
          {isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
        </ActionIcon>
        <Title order={4} style={{ flex: 1 }}>
          {localModel.name}
        </Title>
        {isSelected && (
          <Badge color="blue" variant="filled">
            Selected
          </Badge>
        )}
        <Group gap="xs">
          <Button size="xs" variant="light" onClick={onSelect}>
            Select
          </Button>
          <ActionIcon color="red" variant="light" size="sm" onClick={onDelete}>
            <RiDeleteBinLine />
          </ActionIcon>
        </Group>
      </Group>

      <Collapse in={isExpanded}>
        <Stack>
          <ModelFromImage onModelLoaded={handleModelFromImage} />

          <TextInput
            label="Name"
            value={localModel.name}
            onChange={(e) =>
              setLocalModel((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <TextInput
            label="Model (AIR)"
            value={localModel.input.model}
            onChange={(e) => handleModelChange(e.target.value)}
          />

          <Title order={5}>Parameters</Title>
          <Textarea
            label="Base Prompt"
            value={localModel.input.params.prompt}
            onChange={(e) => handleInputChange("prompt", e.target.value)}
            autosize
            minRows={3}
          />
          <Textarea
            label="Negative Prompt"
            value={localModel.input.params.negativePrompt}
            onChange={(e) =>
              handleInputChange("negativePrompt", e.target.value)
            }
            autosize
            minRows={3}
          />
          <SchedulerCombobox
            value={localModel.input.params.scheduler}
            onChange={(value) => handleInputChange("scheduler", value)}
          />
          <Group grow>
            <NumberInput
              label="Steps"
              value={localModel.input.params.steps}
              onChange={(value) => handleInputChange("steps", value || 0)}
            />
            <NumberInput
              label="CFG Scale"
              value={localModel.input.params.cfgScale}
              onChange={(value) => handleInputChange("cfgScale", value || 0)}
              step={0.1}
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Width"
              value={localModel.input.params.width}
              onChange={(value) => handleInputChange("width", value || 0)}
            />
            <NumberInput
              label="Height"
              value={localModel.input.params.height}
              onChange={(value) => handleInputChange("height", value || 0)}
            />
          </Group>
          <NumberInput
            label="Clip Skip"
            value={localModel.input.params.clipSkip}
            onChange={(value) => handleInputChange("clipSkip", value || 0)}
          />

          <Paper withBorder p="md" mt="md">
            <Title order={5} mb="sm">
              Additional Networks
            </Title>
            <Stack>
              {Object.entries(localModel.input.additionalNetworks || {}).map(
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
            Save Model
          </Button>

          <Box mt="xl">
            <SampleImageGenerator model={localModel} />
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  );
};
