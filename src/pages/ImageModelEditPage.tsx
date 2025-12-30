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
import { Page } from "./Page";
import { d } from "../services/Dependencies";
import { SampleImageGenerator } from "../components/ImageSettings/SampleImageGenerator";
import { ModelFromImage } from "../components/ImageSettings/ModelFromImage";
import { ModelSampleImage } from "../components/ImageSettings/ModelSampleImage";
import {
  PromptsComponent,
  ParametersComponent,
  AdditionalNetworksComponent,
} from "../components/ImageSettings/ImageModelViewComponents";
import type { ImageModel } from "../services/Image/modelGeneration/ImageModel";
import { ConfirmModal } from "../components/Common/ConfirmModal";

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
          (m: ImageModel) => m.id === modelId
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
    navigate("/image-settings");
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

  const handleSampleJobCreated = async (jobId: string) => {
    if (!imageModel) return;
    const updatedModel = { ...imageModel, sampleImageId: jobId };
    setImageModel(updatedModel);
    await d.ImageModelService().SaveImageModel(updatedModel);
  };

  const handleModelFromImage = (loadedModel: ImageModel) => {
    if (!imageModel) return;
    setImageModel((prev) => ({
      ...prev!,
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageModel) return;
    setShowDeleteConfirm(false);
    await d.ImageModelService().DeleteImageModel(imageModel.id);
    d.ImageModelService().SavePendingChanges();
    navigate("/image-settings");
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
          Back to Image Settings
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
