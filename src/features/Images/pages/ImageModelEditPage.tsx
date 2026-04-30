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
  Button,
  Alert,
  Loader,
} from "@mantine/core";
import { RiArrowLeftLine, RiImageLine, RiDeleteBinLine } from "react-icons/ri";
import { Page } from "../../../components/Page";
import { d } from "../../../services/Dependencies";
import { SampleImageGenerator } from "../components/SampleImageGenerator";
import { ModelFromImage } from "../components/ModelFromImage";
import { ModelSampleImage } from "../components/ModelSampleImage";
import { ImageGenerationPromptSection } from "../components/ImageGenerationPromptSection";
import {
  PromptsComponent,
  ParametersComponent,
  AdditionalModelsComponent,
} from "../components/ImageModelViewComponents";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { ConfirmModal } from "../../../components/ConfirmModal";

const ImageModelEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { modelId } = useParams<{ modelId: string }>();
  const [imageModel, setImageModel] = useState<ImageModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        const imageModelService = d.ImageModelService();
        const userImageModels = await imageModelService.GetAllImageModels();
        const model = userImageModels.models.find(
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
  }, [modelId]);

  const handleGoBack = async () => {
    d.ImageModelService().SavePendingChanges();
    navigate(-1);
  };

  const handleModelChange = async (updatedModel: ImageModel) => {
    setImageModel(updatedModel);
    await d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleModelNameChange = (value: string) => {
    if (!imageModel) return;
    const updatedModel = { ...imageModel, name: value };
    setImageModel(updatedModel);
    d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleImageGenerationPromptChange = (value: string) => {
    if (!imageModel) return;
    const updatedModel = {
      ...imageModel,
      imageGenerationPrompt: value || undefined,
    };
    setImageModel(updatedModel);
    d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleAppendToBasePromptChange = (checked: boolean) => {
    if (!imageModel) return;
    const updatedModel = {
      ...imageModel,
      appendImageGenerationPromptToBase: checked,
    };
    setImageModel(updatedModel);
    d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleSampleJobCreated = async (jobId: string) => {
    if (!imageModel) return;
    const updatedModel = { ...imageModel, sampleImageId: jobId };
    setImageModel(updatedModel);
    await d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    if (!imageModel) return;
    const updatedModel: ImageModel = {
      ...imageModel,
      name: loadedModel.name,
      trainedWords: loadedModel.trainedWords,
      input: {
        model: loadedModel.input.model,
        params: {
          ...loadedModel.input.params,
        },
        additionalNetworks: loadedModel.input.additionalNetworks || {},
      },
    };
    setImageModel(updatedModel);
    d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageModel) return;
    setShowDeleteConfirm(false);
    await d.ImageModelService().DeleteImageModel(imageModel.id);
    d.ImageModelService().SavePendingChanges();
    navigate("/default-image-models");
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
          Back to Default Image Models
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

          <ImageGenerationPromptSection
            prompt={imageModel.imageGenerationPrompt || ""}
            appendToBase={imageModel.appendImageGenerationPromptToBase || false}
            onPromptChange={handleImageGenerationPromptChange}
            onAppendToBaseChange={handleAppendToBasePromptChange}
          />

          <PromptsComponent
            imageModel={imageModel}
            onChange={handleModelChange}
          />

          <ParametersComponent
            imageModel={imageModel}
            onChange={handleModelChange}
          />

          <AdditionalModelsComponent
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
useParams;
const PageHeader: React.FC<{
  onBack: () => void;
  modelName: string;
  onDelete: () => void;
}> = ({ onBack, modelName, onDelete }) => (
  <>
    <Group mb="md" justify="space-between">
      <Group>
        <ActionIcon onClick={onBack} size="lg" variant="subtle">
          <RiArrowLeftLine />
        </ActionIcon>
        <RiImageLine size={28} />
        <Title order={1} fw={400}>
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
    <Divider my="xl" />
  </>
);

export default ImageModelEditPage;
