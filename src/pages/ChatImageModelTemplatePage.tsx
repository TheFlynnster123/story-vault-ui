import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiImageLine, RiCheckLine } from "react-icons/ri";
import {
  Title,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Text,
  Divider,
  Loader,
  Button,
  Box,
  Badge,
} from "@mantine/core";
import { useImageModels } from "../components/Images/useImageModels";
import { useChatImageModels } from "../components/Chat/useChatImageModels";
import { ModelSampleImage } from "../components/Images/ModelSampleImage";
import { Page } from "./Page";
import { Theme } from "../components/Common/Theme";

export const ChatImageModelTemplatePage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const { userImageModels, loading: loadingGlobal } = useImageModels();
  const { addFromTemplate, loading: loadingChat } = useChatImageModels(chatId!);

  const handleGoBack = () => {
    navigate(`/chat/${chatId}/image-models`);
  };

  const handleSelectTemplate = async (templateId: string) => {
    const newModel = await addFromTemplate(templateId);
    if (newModel) {
      navigate(`/chat/${chatId}/image-models/edit/${newModel.id}`);
    }
  };

  const loading = loadingGlobal || loadingChat;

  if (loading) {
    return (
      <Page>
        <Paper mt={20}>
          <PageHeader onGoBack={handleGoBack} />
          <Group justify="center" p="xl">
            <Loader />
            <Text>Loading templates...</Text>
          </Group>
        </Paper>
      </Page>
    );
  }

  return (
    <Page>
      <Paper mt={20}>
        <PageHeader onGoBack={handleGoBack} />

        <Stack>
          <Text size="sm" c="dimmed" mb="md">
            Select a template from your default image models. A copy will be
            created for this chat that you can customize independently.
          </Text>

          {userImageModels.models.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Stack align="center" gap="md">
                <RiImageLine size={48} color={Theme.page.textMuted} />
                <Text c="dimmed">No default image models available.</Text>
                <Text size="sm" c="dimmed">
                  Create default image models in the main menu first.
                </Text>
              </Stack>
            </Paper>
          ) : (
            userImageModels.models.map((model) => (
              <TemplateListItem
                key={model.id}
                model={model}
                isGloballySelected={
                  model.id === userImageModels.selectedModelId
                }
                onSelect={() => handleSelectTemplate(model.id)}
              />
            ))
          )}
        </Stack>
      </Paper>
    </Page>
  );
};

interface TemplateListItemProps {
  model: {
    id: string;
    name: string;
    sampleImageId?: string;
    input: {
      params: {
        prompt?: string;
        negativePrompt?: string;
      };
    };
  };
  isGloballySelected: boolean;
  onSelect: () => void;
}

const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const TemplateListItem: React.FC<TemplateListItemProps> = ({
  model,
  isGloballySelected,
  onSelect,
}) => (
  <Paper withBorder p="md" mb="md" w="100%">
    <Group wrap="nowrap" align="flex-start" gap="md" w="100%">
      <Box>
        <ModelSampleImage
          sampleImageJobId={model.sampleImageId}
          size="medium"
        />
      </Box>

      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs">
          <Title order={4}>{model.name}</Title>
          {isGloballySelected && (
            <Badge color="gray" variant="light" size="sm">
              Default Selected
            </Badge>
          )}
        </Group>

        {model.input.params.prompt && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            <strong>Prompt:</strong> {truncateText(model.input.params.prompt)}
          </Text>
        )}

        {model.input.params.negativePrompt && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            <strong>Negative:</strong>{" "}
            {truncateText(model.input.params.negativePrompt)}
          </Text>
        )}
      </Stack>

      <Stack gap="xs" style={{ flexShrink: 0 }}>
        <Button
          size="sm"
          variant="light"
          onClick={onSelect}
          leftSection={<RiCheckLine size={16} />}
          fullWidth
        >
          Use as Template
        </Button>
      </Stack>
    </Group>
  </Paper>
);

const PageHeader: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiImageLine size={24} color={Theme.chatSettings.primary} />
        <Title order={2} fw={400} style={{ color: Theme.chatSettings.primary }}>
          Select Template
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.chatSettings.border }} />
  </>
);

export default ChatImageModelTemplatePage;
