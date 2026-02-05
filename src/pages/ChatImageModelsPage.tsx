import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine, RiImageLine } from "react-icons/ri";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Text,
  Divider,
  Loader,
  Alert,
} from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import { useChatImageModels } from "../components/Chat/useChatImageModels";
import { ImageModelListItem } from "../components/Images/ImageModelListItem";
import type { ImageModel } from "../services/Image/modelGeneration/ImageModel";
import { Page } from "./Page";
import { Theme } from "../components/Common/Theme";
import { d } from "../services/Dependencies";

export const ChatImageModelsPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const {
    chatImageModels,
    loading,
    error,
    saveModel,
    selectModel,
    getSelectedModel,
  } = useChatImageModels(chatId!);

  const handleGoBack = async () => {
    await d.ChatImageModelService(chatId!).SavePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  const handleSelectModel = async (modelId: string) => {
    await selectModel(modelId);
  };

  const handleEditModel = (modelId: string) => {
    navigate(`/chat/${chatId}/image-models/edit/${modelId}`);
  };

  const handleAddFromTemplate = () => {
    navigate(`/chat/${chatId}/image-models/add-from-template`);
  };

  const handleAddNewModel = async () => {
    const newModel = createNewModel();
    const success = await saveModel(newModel);
    if (success) {
      navigate(`/chat/${chatId}/image-models/edit/${newModel.id}`);
    }
  };

  const selectedModel = getSelectedModel();

  if (loading) {
    return (
      <Page>
        <Paper mt={20}>
          <PageHeader onGoBack={handleGoBack} />
          <Group justify="center" p="xl">
            <Loader />
            <Text>Loading image models...</Text>
          </Group>
        </Paper>
      </Page>
    );
  }

  return (
    <Page>
      <Paper mt={20}>
        <PageHeader onGoBack={handleGoBack} />

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        <Stack>
          <Group justify="space-between">
            <Text fw={500}>Chat Image Models</Text>
            <Group gap="xs">
              <Button
                variant="subtle"
                onClick={handleAddFromTemplate}
                style={{ color: Theme.chatSettings.primary }}
                leftSection={<RiImageLine size={16} />}
              >
                Add from Template
              </Button>
              <Button
                variant="subtle"
                onClick={handleAddNewModel}
                style={{ color: Theme.chatSettings.primary }}
                leftSection={<RiAddLine size={16} />}
              >
                New Model
              </Button>
            </Group>
          </Group>

          {chatImageModels.models.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Stack align="center" gap="md">
                <RiImageLine size={48} color={Theme.page.textMuted} />
                <Text c="dimmed">
                  No image models configured for this chat.
                </Text>
                <Text size="sm" c="dimmed">
                  Add a model from your default templates or create a new one.
                </Text>
                <Text size="xs" c="dimmed">
                  Image generation will use your default model until you add one
                  here.
                </Text>
              </Stack>
            </Paper>
          ) : (
            chatImageModels.models.map((model) => (
              <ImageModelListItem
                key={model.id}
                model={model}
                isSelected={selectedModel?.id === model.id}
                onSelect={() => handleSelectModel(model.id)}
                onEdit={() => handleEditModel(model.id)}
              />
            ))
          )}
        </Stack>
      </Paper>
    </Page>
  );
};

const PageHeader: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiImageLine size={24} color={Theme.chatSettings.primary} />
        <Title order={2} fw={400} style={{ color: Theme.chatSettings.primary }}>
          Chat Image Models
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.chatSettings.border }} />
  </>
);

const createNewModel = (): ImageModel => ({
  id: uuidv4(),
  name: "New Image Model",
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

export default ChatImageModelsPage;
