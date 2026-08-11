import React from "react";
import {
  NumberInput,
  Group,
  Stack,
  Title,
  TextInput,
  Slider,
  Text,
  Select,
} from "@mantine/core";
import { SchedulerCombobox } from "../SchedulerCombobox";
import { ModelPreviewImage } from "../ModelPreviewImage";
import type { ImageGenInput } from "../../services/api/ImageGenInput";
import { d } from "../../../../services/Dependencies";
import type { ImageModel } from "../../services/modelGeneration/ImageModel";

interface ParametersComponentProps {
  imageModel: ImageModel;
  onChange: (updatedModel: ImageModel) => void;
}

const DEFAULT_PRIORITY_VALUE = "default";

export const ParametersComponent: React.FC<ParametersComponentProps> = ({
  imageModel,
  onChange,
}) => {
  const handleInputChange = (
    field: keyof ImageGenInput,
    value: string | number,
  ) => {
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        [field]: value,
      },
    });
  };

  const handlePriorityChange = (value: string | null) => {
    onChange({
      ...imageModel,
      priority:
        value && value !== DEFAULT_PRIORITY_VALUE
          ? (value as ImageModel["priority"])
          : undefined,
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
    const { sampleMethod, schedule } = d
      .SchedulerMapper()
      .MapToSampleMethodParams(displayName);
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        sampleMethod,
        schedule,
      },
    });
  };

  const schedulerDisplayName = d
    .SchedulerMapper()
    .MapToDisplayName(imageModel.input.sampleMethod ?? "");
  const modelAir = imageModel.input.model ?? "";
  const isZImage = imageModel.input.ecosystem === "zImage";
  const isKrea2 = imageModel.input.engine === "fal";
  const maxDimension = isZImage ? 2048 : 1024;

  return (
    <Stack>
      <Title order={5}>Parameters</Title>
      {isKrea2 ? (
        <TextInput label="Model" value="Krea 2" readOnly />
      ) : isZImage ? (
        <Select
          label="Z-Image Model"
          value={modelAir}
          onChange={(value) => value && handleModelChange(value)}
          data={[
            { value: "turbo", label: "Turbo" },
            { value: "base", label: "Base" },
          ]}
          allowDeselect={false}
        />
      ) : (
        <>
          <TextInput
            label="Model (AIR)"
            value={modelAir}
            onChange={(e) => handleModelChange(e.target.value)}
          />
          <ModelPreviewImage
            air={modelAir}
            maxHeight="400px"
            maxWidth="100%"
          />
        </>
      )}
      <Select
        label="Workflow Priority"
        value={imageModel.priority ?? DEFAULT_PRIORITY_VALUE}
        onChange={handlePriorityChange}
        data={[
          { value: DEFAULT_PRIORITY_VALUE, label: "Default" },
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
        ]}
        clearable={false}
      />
      {isKrea2 ? (
        <Group grow>
          <Select
            label="Quality"
            value={imageModel.input.size ?? "medium"}
            onChange={(value) => value && handleInputChange("size", value)}
            data={[
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            allowDeselect={false}
          />
          <Select
            label="Aspect Ratio"
            value={imageModel.input.aspectRatio ?? "1:1"}
            onChange={(value) =>
              value && handleInputChange("aspectRatio", value)
            }
            data={["1:1", "4:3", "3:2", "16:9", "2.35:1", "4:5", "2:3", "9:16"]}
            allowDeselect={false}
          />
          <Select
            label="Creativity"
            value={imageModel.input.creativity ?? "medium"}
            onChange={(value) =>
              value && handleInputChange("creativity", value)
            }
            data={["raw", "low", "medium", "high"]}
            allowDeselect={false}
          />
        </Group>
      ) : (
        <>
          <SchedulerCombobox
            value={schedulerDisplayName}
            onChange={handleSchedulerChange}
          />
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Steps
            </Text>
            <Slider
              value={imageModel.input.steps || 20}
              onChange={(value) => handleInputChange("steps", value)}
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
              value={imageModel.input.cfgScale || 7}
              onChange={(value) => handleInputChange("cfgScale", value)}
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
              value={imageModel.input.width}
              max={maxDimension}
              min={0}
              onChange={(value) =>
                handleInputChange("width", Number(value) || 0)
              }
            />
            <NumberInput
              label="Height"
              max={maxDimension}
              min={0}
              value={imageModel.input.height}
              onChange={(value) =>
                handleInputChange("height", Number(value) || 0)
              }
            />
          </Group>
          {imageModel.input.ecosystem === "sd1" && (
            <NumberInput
              label="Clip Skip"
              value={imageModel.input.clipSkip || 0}
              onChange={(value) =>
                handleInputChange("clipSkip", Number(value) || 0)
              }
            />
          )}
        </>
      )}
    </Stack>
  );
};
