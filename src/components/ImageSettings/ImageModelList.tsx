import {
  Stack,
  Loader,
  Text,
  Alert,
  Group,
  Title,
  Button,
  Paper,
} from "@mantine/core";
import React, { useState } from "react";
import { RiAddLine } from "react-icons/ri";
import { useImageModels } from "./useImageModels";
import { ImageModelView } from "./ImageModelView";
import type { ImageModel } from "../../services/Image/modelGeneration/ImageModel";

export const ImageModelList: React.FC = () => {
  const {
    userImageModels,
    loading,
    error,
    saveImageModel,
    deleteImageModel,
    selectImageModel,
    getSelectedModel,
  } = useImageModels();

  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  const createNewModel = (): ImageModel => ({
    id: "default-image-model",
    name: "Default Image Model",
    timestampUtcMs: Date.now(),
    input: {
      model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
      params: {
        prompt: "score_9, score_8_up, score_7_up, score_6_up, source_anime",
        negativePrompt:
          "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad hands, jpeg artifacts",
        scheduler: "DPM2Karras",
        steps: 20,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {},
    },
  });

  const handleToggleExpanded = (modelId: string) => {
    setExpandedModels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  const handleSaveModel = async (model: ImageModel) => {
    await saveImageModel(model);
  };

  const handleDeleteModel = async (modelId: string) => {
    await deleteImageModel(modelId);
  };

  const handleSelectModel = async (modelId: string) => {
    await selectImageModel(modelId);
  };

  const handleAddNewModel = async () => {
    const newModel = createNewModel();
    const success = await saveImageModel(newModel);
    if (success) {
      // Automatically expand the new model for editing
      setExpandedModels((prev) => new Set(prev).add(newModel.id));
    }
  };

  if (loading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
        <Text>Loading image models...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }

  const selectedModel = getSelectedModel();

  return (
    <Stack>
      <Group>
        <Title order={3}>Image Models</Title>
        <Button onClick={handleAddNewModel} leftSection={<RiAddLine />}>
          Add New Model
        </Button>
      </Group>

      {userImageModels.models.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No image models configured yet</Text>
          <Button mt="md" onClick={handleAddNewModel}>
            Create your first model
          </Button>
        </Paper>
      ) : (
        <Stack>
          {userImageModels.models.map((model) => (
            <ImageModelView
              key={model.id}
              model={model}
              isSelected={selectedModel?.id === model.id}
              isExpanded={expandedModels.has(model.id)}
              onToggleExpanded={() => handleToggleExpanded(model.id)}
              onSelect={() => handleSelectModel(model.id)}
              onSave={handleSaveModel}
              onDelete={() => handleDeleteModel(model.id)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
