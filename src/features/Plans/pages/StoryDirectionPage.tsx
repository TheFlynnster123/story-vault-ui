import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiSendPlane2Line,
  RiFileList2Line,
} from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Textarea,
  Text,
  Divider,
  Box,
  Loader,
  ScrollArea,
} from "@mantine/core";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { useStoryDirectionChat } from "../hooks/useStoryDirectionChat";
import { ModelSelect } from "../../AI/components/ModelSelect";
import type { DirectionMessage } from "../services/StoryDirectionService";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";

export const StoryDirectionPage: React.FC = () => {
  const { chatId, planId } = useParams<{ chatId: string; planId: string }>();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const {
    messages,
    isGenerating,
    planModel,
    sendMessage,
    generateUpdatedPlan,
  } = useStoryDirectionChat(chatId!, planId!);
  const [chatModel, setChatModel] = useState<string | null>(null);
  const [modelInitialized, setModelInitialized] = useState(false);

  // Initialize chatModel from planModel once it's available
  if (!modelInitialized && planModel !== undefined) {
    setChatModel(planModel || "");
    setModelInitialized(true);
  }

  const handleGoBack = () => {
    navigate(`/chat/${chatId}`);
  };

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

  const handleGeneratePlan = async () => {
    await generateUpdatedPlan();
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={30}>
        <DirectionHeader onGoBack={handleGoBack} />

        <Box mb="md">
          <ModelSelect
            value={chatModel}
            onChange={setChatModel}
            label="Chat Model"
            withDescription={false}
          />
        </Box>

        <DirectionChatArea messages={messages} isGenerating={isGenerating} />

        <DirectionInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          isGenerating={isGenerating}
        />

        <GeneratePlanButton
          onClick={handleGeneratePlan}
          disabled={messages.length === 0 || isGenerating}
          isGenerating={isGenerating}
        />
      </Paper>
    </Page>
  );
};

interface DirectionHeaderProps {
  onGoBack: () => void;
}

const DirectionHeader: React.FC<DirectionHeaderProps> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiFileList2Line size={24} color={Theme.plan.primary} />
        <Title order={2} fw={400} style={{ color: Theme.plan.primary }}>
          Story Direction
        </Title>
      </Group>
    </Group>
    <Text size="sm" c="dimmed" mb="md">
      Discuss the direction of your story with the AI. When you&apos;re
      satisfied, click &quot;Generate Updated Story Plan&quot; to regenerate the
      plan using this conversation as feedback.
    </Text>
    <Divider mb="md" style={{ borderColor: Theme.plan.border }} />
  </>
);

interface DirectionChatAreaProps {
  messages: ReadonlyArray<DirectionMessage>;
  isGenerating: boolean;
}

const DirectionChatArea: React.FC<DirectionChatAreaProps> = ({
  messages,
  isGenerating,
}) => (
  <ScrollArea h={400} mb="md" offsetScrollbars>
    <Stack gap="sm" p="xs">
      {messages.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Start a conversation about your story&apos;s direction. Ask questions,
          suggest ideas, or discuss what should happen next.
        </Text>
      )}
      {messages.map((msg, index) => (
        <DirectionMessageBubble key={index} message={msg} />
      ))}
      {isGenerating && (
        <Group gap="xs" align="center">
          <Loader size="xs" color={Theme.plan.primary} />
          <Text size="sm" c={Theme.plan.primary}>
            Thinking…
          </Text>
        </Group>
      )}
    </Stack>
  </ScrollArea>
);

interface DirectionMessageBubbleProps {
  message: DirectionMessage;
}

const DirectionMessageBubble: React.FC<DirectionMessageBubbleProps> = ({
  message,
}) => {
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
    $isUser ? Theme.messages.user.background : Theme.plan.backgroundSecondary};
  color: ${Theme.messages.user.text};
  border-left: ${({ $isUser }) =>
    $isUser ? "none" : `3px solid ${Theme.plan.primary}`};
  text-align: left;
`;

interface DirectionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isGenerating: boolean;
}

const DirectionInput: React.FC<DirectionInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  isGenerating,
}) => (
  <Group gap="xs" align="flex-end" mb="md">
    <Textarea
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onKeyDown={onKeyDown}
      placeholder="Discuss story direction…"
      disabled={isGenerating}
      minRows={2}
      autosize
      maxRows={6}
      style={{ flex: 1 }}
      styles={{
        input: {
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          borderColor: Theme.plan.border,
          color: Theme.page.text,
        },
      }}
    />
    <ActionIcon
      size="input-md"
      radius="xl"
      variant="filled"
      color="teal"
      onClick={onSend}
      disabled={!value.trim() || isGenerating}
      aria-label="Send"
    >
      <RiSendPlane2Line style={{ width: "50%", height: "50%" }} />
    </ActionIcon>
  </Group>
);

interface GeneratePlanButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

const GeneratePlanButton: React.FC<GeneratePlanButtonProps> = ({
  onClick,
  disabled,
  isGenerating,
}) => (
  <Button
    fullWidth
    size="lg"
    color="teal"
    onClick={onClick}
    disabled={disabled}
    loading={isGenerating}
    leftSection={<VscRefresh size={20} />}
  >
    Generate Updated Story Plan
  </Button>
);
