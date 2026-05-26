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
  Text,
  Badge,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiImageLine,
  RiDeleteBinLine,
  RiGitBranchLine,
  RiLockLine,
} from "react-icons/ri";
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
import type {
  AnyImageModel,
  ImageModel,
} from "../services/modelGeneration/ImageModel";
import {
  isLegacyJobImageModel,
  isWorkflowImageModel,
} from "../services/modelGeneration/ImageModel";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { Theme } from "../../../components/Theme";

const ChatImageModelEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatId, modelId } = useParams<{ chatId: string; modelId: string }>();
  const [imageModel, setImageModel] = useState<AnyImageModel | null>(null);
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
          (m: AnyImageModel) => m.id === modelId,
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
    if (!isWorkflowImageModel(imageModel)) return;
    const updatedModel = { ...imageModel, name: value };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleImageGenerationPromptChange = (value: string) => {
    if (!isWorkflowImageModel(imageModel)) return;
    const updatedModel = {
      ...imageModel,
      imageGenerationPrompt: value || undefined,
    };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleAppendToBasePromptChange = (checked: boolean) => {
    if (!isWorkflowImageModel(imageModel)) return;
    const updatedModel = {
      ...imageModel,
      appendImageGenerationPromptToBase: checked,
    };
    setImageModel(updatedModel);
    service.SaveModel(updatedModel);
  };

  const handleSampleJobCreated = async (jobId: string) => {
    if (!isWorkflowImageModel(imageModel)) return;
    const updatedModel = { ...imageModel, sampleWorkflowId: jobId };
    setImageModel(updatedModel);
    await service.SaveModel(updatedModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    if (!isWorkflowImageModel(imageModel)) return;
    const updatedModel: ImageModel = {
      ...imageModel,
      name: loadedModel.name,
      trainedWords: loadedModel.trainedWords,
      input: { ...loadedModel.input },
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

  const handleMigrateToWorkflow = async () => {
    if (!imageModel) return;
    const migrated = await service.MigrateModelToWorkflow(imageModel.id);
    if (migrated) {
      setImageModel(migrated);
    }
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
        {isLegacyJobImageModel(imageModel) ? (
          <LegacyModelLockedView
            model={imageModel}
            onMigrate={handleMigrateToWorkflow}
          />
        ) : (
        <Stack>
          <ModelSampleImage
            sampleImageJobId={imageModel.sampleWorkflowId}
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
        )}
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
        <RiImageLine size={28} color={Theme.imageModel.primary} />
        <Title order={1} fw={400} style={{ color: Theme.imageModel.primary }}>
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
    <Divider my="xl" style={{ borderColor: Theme.imageModel.border }} />
  </>
);

const LegacyModelLockedView: React.FC<{
  model: AnyImageModel;
  onMigrate: () => void;
}> = ({ model, onMigrate }) => (
  <Stack>
    <Group>
      <RiLockLine />
      <Badge color="yellow" variant="light">
        Legacy image model
      </Badge>
    </Group>
    <Alert color="yellow" title="Migration required">
      This model was saved with the previous image model format. It cannot be edited
      or used for new image generation until it is migrated to workflow format.
    </Alert>
    <TextInput label="Name" value={model.name} disabled />
    <Text size="sm" c="dimmed">
      Migration keeps this model's id and chat references intact.
    </Text>
    <Button
      color="yellow"
      leftSection={<RiGitBranchLine />}
      onClick={onMigrate}
    >
      Migrate to workflow
    </Button>
  </Stack>
);

export default ChatImageModelEditPage;
