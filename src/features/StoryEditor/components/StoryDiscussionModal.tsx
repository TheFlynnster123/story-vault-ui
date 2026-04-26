import React, { useMemo, useState } from "react";
import {
  Modal,
  Stack,
  ScrollArea,
  Box,
  Text,
  Group,
  Textarea,
  ActionIcon,
  Button,
  Loader,
} from "@mantine/core";
import {
  RiSendPlane2Line,
  RiCheckDoubleLine,
  RiCheckLine,
} from "react-icons/ri";
import { LuBookOpen } from "react-icons/lu";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import { Theme } from "../../../components/Theme";
import { ModelSelect } from "../../AI/components/ModelSelect";
import { GenerateButton } from "../../AI/components/GenerateButton";
import { DiscussionService } from "../../Discussion/services/DiscussionService";
import { createStoryCreationDiscussionConfig } from "../../Discussion/services/StoryCreationDiscussionConfig";
import { useDiscussionChat } from "../../Discussion/hooks/useDiscussionChat";
import type { DiscussionMessage } from "../../Discussion/services/DiscussionMessage";

interface StoryDiscussionModalProps {
  onStoryGenerated: (story: string) => void;
}

export const StoryDiscussionModal: React.FC<StoryDiscussionModalProps> = ({
  onStoryGenerated,
}) => {
  const [opened, setOpened] = useState(false);

  const handleStoryGenerated = (story: string) => {
    onStoryGenerated(story);
    setOpened(false);
  };

  return (
    <>
      <GenerateButton onClick={() => setOpened(true)} />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Group gap="xs">
            <LuBookOpen size={20} color={Theme.chatSettings.primary} />
            <Text fw={500} style={{ color: Theme.chatSettings.primary }}>
              Discuss Story with AI
            </Text>
          </Group>
        }
        size="xl"
        centered
      >
        {opened && (
          <StoryDiscussionModalContent
            onStoryGenerated={handleStoryGenerated}
          />
        )}
      </Modal>
    </>
  );
};

interface StoryDiscussionModalContentProps {
  onStoryGenerated: (story: string) => void;
}

const StoryDiscussionModalContent: React.FC<
  StoryDiscussionModalContentProps
> = ({ onStoryGenerated }) => {
  const service = useMemo(
    () =>
      new DiscussionService(
        createStoryCreationDiscussionConfig(onStoryGenerated),
      ),
    [onStoryGenerated],
  );

  const {
    messages,
    isGenerating,
    sendMessage,
    sendFinalFeedbackAndGenerate,
    acceptMessage,
    canAcceptMessage,
  } = useDiscussionChat(service);

  const [inputValue, setInputValue] = useState("");
  const [chatModel, setChatModel] = useState<string | null>(null);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;
    const message = inputValue;
    setInputValue("");
    await sendMessage(message, chatModel || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerate = async () => {
    const finalFeedback = inputValue.trim() ? inputValue : undefined;
    setInputValue("");
    await sendFinalFeedbackAndGenerate(finalFeedback);
  };

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Discuss your story idea with the AI. When you see a story you like,
        click <strong>Use This Story</strong>, or click{" "}
        <strong>Generate Story</strong> to synthesise the conversation into a
        final story context.
      </Text>

      <ModelSelect
        value={chatModel}
        onChange={setChatModel}
        withDescription={false}
      />

      <ScrollArea h={350} offsetScrollbars>
        <Stack gap="sm" p="xs">
          {messages.length === 0 && (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              Describe what kind of story you want to create and discuss ideas
              with the AI.
            </Text>
          )}
          {messages.map((msg, index) => {
            const isLastAssistant =
              msg.role === "assistant" &&
              messages
                .slice(index + 1)
                .every((m) => m.role !== "assistant");
            return (
              <React.Fragment key={index}>
                <StoryMessageBubble message={msg} />
                {canAcceptMessage && isLastAssistant && (
                  <Box style={{ textAlign: "left" }}>
                    <Button
                      size="compact-sm"
                      variant="light"
                      color="violet"
                      leftSection={<RiCheckLine size={14} />}
                      onClick={() => acceptMessage(msg.content)}
                      disabled={isGenerating}
                    >
                      Use This Story
                    </Button>
                  </Box>
                )}
              </React.Fragment>
            );
          })}
          {isGenerating && (
            <Group gap="xs" align="center">
              <Loader size="xs" color={Theme.chatSettings.primary} />
              <Text size="sm" c={Theme.chatSettings.primary}>
                Thinking…
              </Text>
            </Group>
          )}
        </Stack>
      </ScrollArea>

      <Stack gap="xs">
        <Group gap="xs" align="flex-end">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your story idea…"
            disabled={isGenerating}
            minRows={2}
            autosize
            maxRows={4}
            style={{ flex: 1 }}
            styles={{
              input: {
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderColor: Theme.chatSettings.border,
                color: Theme.page.text,
              },
            }}
          />
          <ActionIcon
            size="lg"
            radius="xl"
            variant="filled"
            color="violet"
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
          >
            <RiSendPlane2Line />
          </ActionIcon>
        </Group>
        <Button
          size="md"
          radius="xl"
          variant="filled"
          color="violet"
          onClick={handleGenerate}
          disabled={
            isGenerating || (!inputValue.trim() && messages.length === 0)
          }
          leftSection={<RiCheckDoubleLine />}
          fullWidth
        >
          Generate Story
        </Button>
      </Stack>
    </Stack>
  );
};

interface StoryMessageBubbleProps {
  message: DiscussionMessage;
}

const StoryMessageBubble: React.FC<StoryMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <Box style={{ textAlign: isUser ? "right" : "left" }}>
      <MessageBubble $isUser={isUser}>
        {isUser ? (
          <Text size="sm">{message.content}</Text>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </MessageBubble>
    </Box>
  );
};

const MessageBubble = styled.div<{ $isUser: boolean }>`
  display: inline-block;
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: small;
  box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.3);

  background-color: ${({ $isUser }) =>
    $isUser
      ? Theme.messages.user.background
      : Theme.chatSettings.backgroundSecondary};
  color: ${Theme.messages.user.text};
  border-left: ${({ $isUser }) =>
    $isUser ? "none" : `3px solid ${Theme.chatSettings.primary}`};
  text-align: left;
`;
