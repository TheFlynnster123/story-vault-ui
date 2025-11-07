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
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import { useImageModels } from "../../hooks/useImageModels";
import { ImageModelView } from "./ImageModelView";

export const ImageModelList: React.FC<{
  onSave?: () => void;
}> = ({ onSave }) => {
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
    id: `model_${Date.now()}`,
    name: "Default",
    timestampUtcMs: Date.now(),
    input: {
      model: "urn:air:sd1:checkpoint:civitai:4384@128713",
      params: {
        prompt:
          "(masterpiece), (extremely intricate:1.3), (realistic), portrait of a girl, the most beautiful in the world, (medieval armor), metal reflections, upper body, outdoors, intense sunlight, far away castle, professional photograph of a stunning woman detailed, sharp focus, dramatic, award winning, cinematic lighting, octane render  unreal engine,  volumetrics dtx, (film grain, blurry background, blurry foreground, bokeh, depth of field, sunset, motion blur:1.3), chainmail",
        negativePrompt: "BadDream, (UnrealisticDream:1.3)",
        scheduler: "DPM++ SDE Karras",
        steps: 30,
        cfgScale: 9,
        width: 1120,
        height: 1824,
        clipSkip: 2,
      },
      additionalNetworks: {},
    },
    sampleImageId: undefined,
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
    const success = await saveImageModel(model);
    if (success && onSave) {
      onSave();
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    const success = await deleteImageModel(modelId);
    if (success && onSave) {
      onSave();
    }
  };

  const handleSelectModel = async (modelId: string) => {
    await selectImageModel(modelId);
    if (onSave) {
      onSave();
    }
  };

  const handleAddNewModel = async () => {
    const newModel = createNewModel();
    const success = await saveImageModel(newModel);
    if (success) {
      if (onSave) onSave();
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
