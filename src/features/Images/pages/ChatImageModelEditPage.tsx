import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Title,
  Paper,
  ActionIcon,
  Group,
  Divider,
  Stack,
  TextInput,
  Textarea,
  Button,
  Alert,
  Loader,
} from "@mantine/core";
import { RiArrowLeftLine, RiImageLine, RiDeleteBinLine } from "react-icons/ri";
import { Page } from "../../../pages/Page";
import { d } from "../../../services/Dependencies";
import { SampleImageGenerator } from "../components/SampleImageGenerator";
import { ModelFromImage } from "../components/ModelFromImage";
import { ModelSampleImage } from "../components/ModelSampleImage";
import {
  PromptsComponent,
  ParametersComponent,
  AdditionalNetworksComponent,
} from "../components/ImageModelViewComponents";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { ConfirmModal } from "../../../components/Common/ConfirmModal";
import { Theme } from "../../../components/Common/Theme";

const ChatImageModelEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatId, modelId } = useParams<{ chatId: string; modelId: string }>();
  const [imageModel, setImageModel] = useState<ImageModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const service = d.ChatImageModelService(chatId!);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        const chatImageModels = await service.GetAll();
        const model = chatImageModels.models.find(
          (m: ImageModel) => m.id === modelId,
        );

        if (model) {
          setImageModel(model);
        } else {
          setError("Image model not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load model");
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [chatId, modelId]);

  const handleGoBack = async () => {
    await service.SavePendingChanges();
    navigate(`/chat/${chatId}/image-models`);
  };

  const handleModelChange = async (updatedModel: ImageModel) => {
    setImageModel(updatedModel);
    await service.SaveModel(updatedModel);
  };

  const handleModelNameChange = (value: string) => {
    if (!imageModel) return;
    const updatedModel = { ...imageModel, name: value };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleImageGenerationPromptChange = (value: string) => {
    if (!imageModel) return;
    const updatedModel = {
      ...imageModel,
      imageGenerationPrompt: value || undefined,
    };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleSampleJobCreated = async (jobId: string) => {
    if (!imageModel) return;
    const updatedModel = { ...imageModel, sampleImageId: jobId };
    setImageModel(updatedModel);
    await service.SaveModel(updatedModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    if (!imageModel) return;
    const updatedModel: ImageModel = {
      ...imageModel,
      name: loadedModel.name,
      input: {
        model: loadedModel.input.model,
        params: {
          ...loadedModel.input.params,
        },
        additionalNetworks: loadedModel.input.additionalNetworks || {},
      },
    };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageModel) return;
    setShowDeleteConfirm(false);
    await service.DeleteModel(imageModel.id);
    await service.SavePendingChanges();
    navigate(`/chat/${chatId}/image-models`);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <Page>
        <Stack align="center" p="xl">
          <Loader />
        </Stack>
      </Page>
    );
  }

  if (error || !imageModel) {
    return (
      <Page>
        <Alert color="red" title="Error">
          {error || "Model not found"}
        </Alert>
        <Button onClick={handleGoBack} mt="md">
          Back to Chat Image Models
        </Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        onBack={handleGoBack}
        modelName={imageModel.name}
        onDelete={handleDeleteClick}
      />
      <Paper withBorder p="xl" radius="md">
        <Stack>
          <ModelSampleImage
            sampleImageJobId={imageModel.sampleImageId}
            size="large"
          />

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

          <Textarea
            label="Image Generation Prompt (Optional)"
            description="Custom prompt that instructs the AI how to describe scenes for this model. Leave empty to use the system default."
            placeholder="Leave empty to use the default image generation prompt..."
            value={imageModel.imageGenerationPrompt || ""}
            onChange={(e) => handleImageGenerationPromptChange(e.target.value)}
            minRows={4}
            autosize
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
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Image Model"
        message={`Are you sure you want to delete "${imageModel.name}"? This action cannot be undone.`}
      />
    </Page>
  );
};

const PageHeader: React.FC<{
  onBack: () => void;
  modelName: string;
  onDelete: () => void;
}> = ({ onBack, modelName, onDelete }) => (
  <>
    <Group mb="md" justify="space-between">
      <Group>
        <ActionIcon onClick={onBack} size="lg" variant="subtle">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiImageLine size={28} color={Theme.chatSettings.primary} />
        <Title order={1} fw={400} style={{ color: Theme.chatSettings.primary }}>
          {modelName}
        </Title>
      </Group>
      <ActionIcon
        color="red"
        variant="light"
        size="xl"
        onClick={onDelete}
        aria-label="Delete model"
      >
        <RiDeleteBinLine />
      </ActionIcon>
    </Group>
    <Divider my="xl" style={{ borderColor: Theme.chatSettings.border }} />
  </>
);

export default ChatImageModelEditPage;
