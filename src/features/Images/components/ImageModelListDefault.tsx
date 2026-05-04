import { Stack, Loader, Text, Alert, Button, Paper } from "@mantine/core";
import React, { useState } from "react";
import { RiAddLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { useImageModels } from "../hooks/useImageModels";
import { ImageModelListItem } from "./ImageModelListItem";
import { AddImageModelModal } from "./AddImageModelModal";

export const ImageModelList: React.FC = () => {
  const navigate = useNavigate();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const {
    userImageModels,
    loading,
    error,
    saveImageModel,
    selectImageModel,
    getSelectedModel,
  } = useImageModels();

  const handleSelectModel = async (modelId: string) => {
    await selectImageModel(modelId);
  };

  const handleEditModel = (modelId: string) => {
    navigate(`/default-image-models/edit/${modelId}`);
  };

  const handleModelCreated = async (model: ImageModel) => {
    const success = await saveImageModel(model);
    if (success) {
      navigate(`/default-image-models/edit/${model.id}`);
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
      <Button onClick={() => setAddModalOpen(true)} leftSection={<RiAddLine />}>
        Add Model
      </Button>

      <AddImageModelModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onModelCreated={handleModelCreated}
      />

      {userImageModels.models.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No image models configured yet</Text>
          <Button mt="md" onClick={() => setAddModalOpen(true)}>
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
