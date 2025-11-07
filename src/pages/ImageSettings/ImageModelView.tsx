import React, { useState } from "react";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import {
  TextInput,
  Button,
  Group,
  Title,
  Paper,
  ActionIcon,
  Stack,
  Collapse,
  Badge,
  ThemeIcon,
} from "@mantine/core";
import {
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
} from "react-icons/ri";
import { SampleImageGenerator } from "./SampleImageGenerator";
import { ModelFromImage } from "./ModelFromImage";
import { ModelSampleImage } from "./ModelSampleImage";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  PromptsComponent,
  ParametersComponent,
  AdditionalNetworksComponent,
} from "./ImageModelViewComponents";

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
  const [imageModel, setImageModel] = useState<ImageModel>(model);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  React.useEffect(() => {
    setImageModel(model);
  }, [model]);

  const handleModelChange = (updatedModel: ImageModel) => {
    setImageModel(updatedModel);
  };

  const handleModelNameChange = (value: string) => {
    setImageModel((prev) => ({ ...prev, name: value }));
  };

  const handleSave = () => {
    onSave(imageModel);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleSampleJobCreated = async (jobId: string) => {
    const updatedModel = { ...imageModel, sampleImageId: jobId };
    setImageModel(updatedModel);
    onSave(updatedModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    setImageModel((prev) => ({
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
      <Stack align="center" justify="center" onClick={onToggleExpanded}>
        <Title order={4} style={{ flex: 1 }}>
          {imageModel.name}
        </Title>
        <ModelSampleImage sampleImageJobId={model.sampleImageId} size="large" />
        <Group gap="xs" justify="center">
          {isSelected && (
            <Badge color="blue" variant="filled">
              Selected
            </Badge>
          )}
          <Button size="md" variant="light" onClick={onSelect}>
            Select
          </Button>
          <ActionIcon
            color="red"
            variant="light"
            size="xl"
            onClick={handleDeleteClick}
          >
            <RiDeleteBinLine />
          </ActionIcon>
        </Group>

        <ThemeIcon size="xl" variant="transparent">
          {isExpanded ? (
            <RiArrowUpSLine size="md" />
          ) : (
            <RiArrowDownSLine size="md" />
          )}
        </ThemeIcon>
      </Stack>

      <Collapse in={isExpanded}>
        <Stack>
          <SampleImageGenerator
            model={imageModel}
            onSampleImageCreated={handleSampleJobCreated}
          />
          <ModelFromImage onModelLoaded={handleModelFromImage} />

          <TextInput
            label="Name"
            value={imageModel.name}
            onChange={(e) => handleModelNameChange(e.target.value)}
          />

          <PromptsComponent
            imageModel={imageModel}
            onChange={handleModelChange}
          />

          <ParametersComponent
            imageModel={imageModel}
            onChange={handleModelChange}
          />

          <AdditionalNetworksComponent
            imageModel={imageModel}
            onChange={handleModelChange}
          />

          <Button onClick={handleSave} mt="xl">
            Save Model
          </Button>
        </Stack>
      </Collapse>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Image Model"
        message={`Are you sure you want to delete "${imageModel.name}"? This action cannot be undone.`}
      />
    </Paper>
  );
};
