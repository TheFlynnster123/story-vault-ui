import React from "react";
import { NumberInput, Group, Stack, Title, TextInput } from "@mantine/core";
import { SchedulerCombobox } from "../SchedulerCombobox";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { d } from "../../../services/Dependencies";
import type { ImageModel } from "../../../services/Image/modelGeneration/ImageModel";

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
    value: string | number
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
      <SchedulerCombobox
        value={imageModel.input.params.scheduler}
        onChange={handleSchedulerChange}
      />
      <Group grow>
        <NumberInput
          label="Steps"
          value={imageModel.input.params.steps || 0}
          onChange={(value) =>
            handleParameterChange("steps", Number(value) || 0)
          }
        />
        <NumberInput
          label="CFG Scale"
          value={imageModel.input.params.cfgScale || 0}
          onChange={(value) =>
            handleParameterChange("cfgScale", Number(value) || 0)
          }
          step={0.1}
        />
      </Group>
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
