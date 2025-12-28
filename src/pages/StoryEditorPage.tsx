import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Textarea,
  Button,
  Group,
  Stack,
  Title,
  ActionIcon,
} from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { LuBookOpen } from "react-icons/lu";
import { d } from "../services/Dependencies";
import { Theme } from "../components/Common/Theme";
import { Page } from "./Page";

export const StoryEditorPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const messages = d.UserChatProjection(chatId).GetMessages();
    const storyMessage = messages.find((m) => m.type === "story");

    if (storyMessage) {
      setContent(storyMessage.content || "");
      setStoryId(storyMessage.id);
    }
    setIsLoading(false);
  }, [chatId]);

  const handleSave = async () => {
    if (!chatId || !storyId) return;

    await d.ChatService(chatId).EditStory(storyId, content);
    navigate(`/chat/${chatId}`);
  };

  const handleCancel = () => {
    navigate(`/chat/${chatId}`);
  };

  if (isLoading) return null;

  return (
    <Page>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <ActionIcon onClick={handleCancel} variant="subtle" size="lg">
            <RiArrowLeftLine color={Theme.page.text} />
          </ActionIcon>
          <LuBookOpen size={24} color={Theme.chatSettings.primary} />
          <Title
            order={2}
            fw={400}
            style={{ color: Theme.chatSettings.primary }}
          >
            Edit Story
          </Title>
        </Group>
      </Group>

      <Stack mt="xl">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          placeholder="Enter story details..."
          autosize
          minRows={15}
          autoFocus
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Stack>
    </Page>
  );
};
