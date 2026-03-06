import { Stack, Loader, Text, Alert, Button, Paper } from "@mantine/core";
import React from "react";
import { RiAddLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { useImageModels } from "../hooks/useImageModels";
import { ImageModelListItem } from "./ImageModelListItem";

export const ImageModelList: React.FC = () => {
  const navigate = useNavigate();
  const {
    userImageModels,
    loading,
    error,
    saveImageModel,
    selectImageModel,
    getSelectedModel,
  } = useImageModels();
  const createNewModel = (): ImageModel => {
    const timestamp = Date.now();
    return {
      id: uuidv4(),
      name: "Default Image Model",
      timestampUtcMs: timestamp,
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
    };
  };

  const handleSelectModel = async (modelId: string) => {
    await selectImageModel(modelId);
  };

  const handleEditModel = (modelId: string) => {
    navigate(`/default-image-models/edit/${modelId}`);
  };

  const handleAddNewModel = async () => {
    const newModel = createNewModel();
    const success = await saveImageModel(newModel);
    if (success) {
      // Navigate to edit page for the new model
      navigate(`/default-image-models/edit/${newModel.id}`);
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
    <Stack w="100%" align="center">
      <Button onClick={handleAddNewModel} leftSection={<RiAddLine />}>
        Add New Model
      </Button>

      {userImageModels.models.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No image models configured yet</Text>
          <Button mt="md" onClick={handleAddNewModel}>
            Create your first model
          </Button>
        </Paper>
      ) : (
        <Stack w="100%">
          {userImageModels.models.map((model) => (
            <ImageModelListItem
              key={model.id}
              model={model}
              isSelected={selectedModel?.id === model.id}
              onSelect={() => handleSelectModel(model.id)}
              onEdit={() => handleEditModel(model.id)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
