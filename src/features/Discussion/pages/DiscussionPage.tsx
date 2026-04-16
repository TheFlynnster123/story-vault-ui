import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiArrowLeftLine, RiSendPlane2Line } from "react-icons/ri";
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
import { ModelSelect } from "../../AI/components/ModelSelect";
import { useDiscussionChat } from "../hooks/useDiscussionChat";
import type { DiscussionService } from "../services/DiscussionService";
import type { DiscussionMessage } from "../services/DiscussionMessage";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";

interface DiscussionPageProps {
  chatId: string;
  service: DiscussionService;
  config: DiscussionPageConfig;
}

export const DiscussionPage: React.FC<DiscussionPageProps> = ({
  chatId,
  service,
  config,
}) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const {
    messages,
    isGenerating,
    defaultModel,
    sendMessage,
    generateFromFeedback,
  } = useDiscussionChat(service);
  const [chatModel, setChatModel] = useState<string | null>(null);
  const [modelInitialized, setModelInitialized] = useState(false);

  useEffect(() => {
    if (!modelInitialized && defaultModel !== undefined) {
      setChatModel(defaultModel || "");
      setModelInitialized(true);
    }
  }, [defaultModel, modelInitialized]);

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

  const handleGenerate = async () => {
    await generateFromFeedback();
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={30}>
        <DiscussionHeader config={config} onGoBack={handleGoBack} />

        <Box mb="md">
          <ModelSelect
            value={chatModel}
            onChange={setChatModel}
            label="Chat Model"
            withDescription={false}
          />
        </Box>

        <DiscussionChatArea
          messages={messages}
          isGenerating={isGenerating}
          config={config}
        />

        <DiscussionInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          isGenerating={isGenerating}
          config={config}
        />

        <GenerateButton
          onClick={handleGenerate}
          disabled={messages.length === 0 || isGenerating}
          isGenerating={isGenerating}
          config={config}
        />
      </Paper>
    </Page>
  );
};

// ---- Sub-components ----

interface DiscussionHeaderProps {
  config: DiscussionPageConfig;
  onGoBack: () => void;
}

const DiscussionHeader: React.FC<DiscussionHeaderProps> = ({
  config,
  onGoBack,
}) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        {config.icon}
        <Title order={2} fw={400} style={{ color: config.primaryColor }}>
          {config.title}
        </Title>
      </Group>
    </Group>
    <Text size="sm" c="dimmed" mb="md">
      {config.description}
    </Text>
    <Divider mb="md" style={{ borderColor: config.borderColor }} />
  </>
);

interface DiscussionChatAreaProps {
  messages: ReadonlyArray<DiscussionMessage>;
  isGenerating: boolean;
  config: DiscussionPageConfig;
}

const DiscussionChatArea: React.FC<DiscussionChatAreaProps> = ({
  messages,
  isGenerating,
  config,
}) => (
  <ScrollArea h={400} mb="md" offsetScrollbars>
    <Stack gap="sm" p="xs">
      {messages.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {config.emptyStateText}
        </Text>
      )}
      {messages.map((msg, index) => (
        <DiscussionMessageBubble key={index} message={msg} config={config} />
      ))}
      {isGenerating && (
        <Group gap="xs" align="center">
          <Loader size="xs" color={config.primaryColor} />
          <Text size="sm" c={config.primaryColor}>
            Thinking…
          </Text>
        </Group>
      )}
    </Stack>
  </ScrollArea>
);

interface DiscussionMessageBubbleProps {
  message: DiscussionMessage;
  config: DiscussionPageConfig;
}

const DiscussionMessageBubble: React.FC<DiscussionMessageBubbleProps> = ({
  message,
  config,
}) => {
  const isUser = message.role === "user";

  return (
    <Box style={{ textAlign: isUser ? "right" : "left" }}>
      <MessageBubble
        $isUser={isUser}
        $assistantBg={config.assistantBubbleBackground}
        $primaryColor={config.primaryColor}
      >
        {isUser ? (
          <Text size="sm">{message.content}</Text>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </MessageBubble>
    </Box>
  );
};

const MessageBubble = styled.div<{
  $isUser: boolean;
  $assistantBg: string;
  $primaryColor: string;
}>`
  display: inline-block;
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: small;
  box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.3);

  background-color: ${({ $isUser, $assistantBg }) =>
    $isUser ? Theme.messages.user.background : $assistantBg};
  color: ${Theme.messages.user.text};
  border-left: ${({ $isUser, $primaryColor }) =>
    $isUser ? "none" : `3px solid ${$primaryColor}`};
  text-align: left;
`;

interface DiscussionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isGenerating: boolean;
  config: DiscussionPageConfig;
}

const DiscussionInput: React.FC<DiscussionInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  isGenerating,
  config,
}) => (
  <Group gap="xs" align="flex-end" mb="md">
    <Textarea
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onKeyDown={onKeyDown}
      placeholder={config.inputPlaceholder}
      disabled={isGenerating}
      minRows={2}
      autosize
      maxRows={6}
      style={{ flex: 1 }}
      styles={{
        input: {
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          borderColor: config.borderColor,
          color: Theme.page.text,
        },
      }}
    />
    <ActionIcon
      size="input-md"
      radius="xl"
      variant="filled"
      color={config.accentColor}
      onClick={onSend}
      disabled={!value.trim() || isGenerating}
      aria-label="Send"
    >
      <RiSendPlane2Line style={{ width: "50%", height: "50%" }} />
    </ActionIcon>
  </Group>
);

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  config: DiscussionPageConfig;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  disabled,
  isGenerating,
  config,
}) => (
  <Button
    fullWidth
    size="lg"
    color={config.accentColor}
    onClick={onClick}
    disabled={disabled}
    loading={isGenerating}
    leftSection={<VscRefresh size={20} />}
  >
    {config.generateButtonLabel}
  </Button>
);
