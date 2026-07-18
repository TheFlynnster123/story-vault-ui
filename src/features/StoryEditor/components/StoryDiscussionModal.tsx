import React, { useMemo, useRef, useState } from "react";
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
  Collapse,
  UnstyledButton,
  Badge,
} from "@mantine/core";
import {
  RiSendPlane2Line,
  RiCheckDoubleLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
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
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

interface StoryDiscussionModalProps {
  onStoryGenerated: (story: string) => void;
}

export const StoryDiscussionModal: React.FC<StoryDiscussionModalProps> = ({
  onStoryGenerated,
}) => {
  const [opened, setOpened] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleStoryGenerated = (story: string) => {
    onStoryGenerated(story);
    setOpened(false);
  };
  const restoreTriggerFocus = () =>
    triggerRef.current?.focus({ preventScroll: true });

  return (
    <>
      <GenerateButton ref={triggerRef} onClick={() => setOpened(true)} />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        onExitTransitionEnd={restoreTriggerFocus}
        returnFocus={false}
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
    getLLMContext,
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
        ariaLabel="Chat Model"
        emptyValueLabel="Default Chat Model"
        hideLabel
        withDescription={false}
      />

      <StoryDiscussionChatSurface>
        <StoryLLMContextPanel context={getLLMContext()} />
        <ScrollArea style={{ flex: 1 }} offsetScrollbars>
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
                messages.slice(index + 1).every((m) => m.role !== "assistant");
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
      </StoryDiscussionChatSurface>

      <Stack
        gap={STORY_DISCUSSION_COMPOSER_BUTTON_GAP}
        style={{ marginBottom: 0 }}
      >
        <Group
          gap={STORY_DISCUSSION_COMPOSER_BUTTON_GAP}
          align="stretch"
          wrap="nowrap"
        >
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
              wrapper: {
                minHeight: STORY_DISCUSSION_COMPOSER_MIN_HEIGHT,
              },
              input: {
                padding: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderColor: Theme.chatSettings.border,
                color: Theme.page.text,
              },
            }}
          />
          <Box
            style={{
              width: 40,
              minHeight: STORY_DISCUSSION_COMPOSER_MIN_HEIGHT,
              display: "grid",
              gridTemplateRows: "1fr 1fr",
              gap: STORY_DISCUSSION_COMPOSER_BUTTON_GAP,
            }}
          >
            <ActionIcon
              size="input-md"
              radius="xl"
              variant="filled"
              color="violet"
              onClick={handleSend}
              disabled={!inputValue.trim() || isGenerating}
              aria-label="Send"
              title="Send"
              style={{ width: "100%", height: "100%" }}
            >
              <RiSendPlane2Line />
            </ActionIcon>
            <ActionIcon
              size="input-md"
              radius="xl"
              variant="light"
              color="violet"
              onClick={handleGenerate}
              disabled={
                isGenerating || (!inputValue.trim() && messages.length === 0)
              }
              aria-label="Generate Story"
              title="Generate Story"
              style={{ width: "100%", height: "100%" }}
            >
              <RiCheckDoubleLine />
            </ActionIcon>
          </Box>
        </Group>
      </Stack>
    </Stack>
  );
};

const ROLE_COLOR: Record<string, string> = {
  system: "#9370DB",
  user: "#4CAF50",
  assistant: "#2196F3",
};

const STORY_DISCUSSION_COMPOSER_MIN_HEIGHT = 76;
const STORY_DISCUSSION_COMPOSER_BUTTON_GAP = 4;

interface StoryLLMContextPanelProps {
  context: LLMMessage[];
}

const StoryLLMContextPanel: React.FC<StoryLLMContextPanelProps> = ({
  context,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Box px="xs" pt="xs" pb={open ? "xs" : 0}>
      <UnstyledButton
        onClick={() => setOpen((current) => !current)}
        style={{ width: "100%" }}
      >
        <Group gap={4} align="center">
          {open ? (
            <RiArrowUpSLine size={14} color={Theme.page.textMuted} />
          ) : (
            <RiArrowDownSLine size={14} color={Theme.page.textMuted} />
          )}
          <Text size="xs" c="dimmed">
            LLM Context ({context.length} message
            {context.length !== 1 ? "s" : ""})
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse in={open} style={{ overflow: open ? "visible" : "hidden" }}>
        <ScrollArea h={220} mt="xs">
          <Stack gap="xs">
            {context.map((msg, index) => (
              <Box
                key={index}
                pl="xs"
                style={{
                  borderLeft: `3px solid ${ROLE_COLOR[msg.role] ?? "#888"}`,
                }}
              >
                <Badge
                  size="xs"
                  variant="outline"
                  color={
                    msg.role === "system"
                      ? "violet"
                      : msg.role === "user"
                        ? "green"
                        : "blue"
                  }
                  mb={2}
                >
                  {msg.role}
                </Badge>
                <Text
                  size="xs"
                  style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                >
                  {msg.content}
                </Text>
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      </Collapse>
    </Box>
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

const StoryDiscussionChatSurface = styled.div`
  flex: 1;
  min-height: 0;
  margin-bottom: 2px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 6px;
  background: rgba(8, 10, 16, 0.62);
  overflow: hidden;
`;
