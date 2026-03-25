import React from "react";
import {
  NumberInput,
  Group,
  Stack,
  Title,
  TextInput,
  Slider,
  Text,
} from "@mantine/core";
import { SchedulerCombobox } from "../SchedulerCombobox";
import { ModelPreviewImage } from "../ModelPreviewImage";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { d } from "../../../../services/Dependencies";
import type { ImageModel } from "../../services/modelGeneration/ImageModel";

interface ParametersComponentProps {
  imageModel: ImageModel;
  onChange: (updatedModel: ImageModel) => void;
}

export const ParametersComponent: React.FC<ParametersComponentProps> = ({
  imageModel,
  onChange,
}) => {
  const handleParameterChange = (
    field: keyof FromTextInput["params"],
    value: string | number,
  ) => {
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        params: {
          ...imageModel.input.params,
          [field]: value,
        },
      },
    });
  };

  const handleModelChange = (value: string) => {
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        model: value,
      },
    });
  };

  const handleSchedulerChange = (displayName: string) => {
    const schedulerName = d.SchedulerMapper().MapToSchedulerName(displayName);
    handleParameterChange("scheduler", schedulerName);
  };

  return (
    <Stack>
      <Title order={5}>Parameters</Title>
      <TextInput
        label="Model (AIR)"
        value={imageModel.input.model}
        onChange={(e) => handleModelChange(e.target.value)}
      />
      <ModelPreviewImage air={imageModel.input.model} maxHeight="400px" maxWidth="100%" />
      <SchedulerCombobox
        value={imageModel.input.params.scheduler}
        onChange={handleSchedulerChange}
      />
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Steps
        </Text>
        <Slider
          value={imageModel.input.params.steps || 20}
          onChange={(value) => handleParameterChange("steps", value)}
          min={10}
          max={50}
          step={1}
          label={(value) => value.toString()}
          marks={[
            { value: 10, label: "10" },
            { value: 30, label: "30" },
            { value: 50, label: "50" },
          ]}
        />
      </Stack>
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          CFG Scale
        </Text>
        <Slider
          value={imageModel.input.params.cfgScale || 7}
          onChange={(value) => handleParameterChange("cfgScale", value)}
          min={1}
          max={10}
          step={0.5}
          label={(value) => value.toFixed(1)}
          marks={[
            { value: 1, label: "1" },
            { value: 5, label: "5" },
            { value: 10, label: "10" },
          ]}
        />
      </Stack>
      <Group grow>
        <NumberInput
          label="Width"
          value={imageModel.input.params.width}
          max={1024}
          min={0}
          onChange={(value) =>
            handleParameterChange("width", Number(value) || 0)
          }
        />
        <NumberInput
          label="Height"
          max={1024}
          min={0}
          value={imageModel.input.params.height}
          onChange={(value) =>
            handleParameterChange("height", Number(value) || 0)
          }
        />
      </Group>
      <NumberInput
        label="Clip Skip"
        value={imageModel.input.params.clipSkip || 0}
        onChange={(value) =>
          handleParameterChange("clipSkip", Number(value) || 0)
        }
      />
    </Stack>
  );
};
