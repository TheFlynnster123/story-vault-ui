import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiArrowLeftLine, RiSendPlane2Line, RiCheckLine } from "react-icons/ri";
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
    generateInitialMessage,
    sendFinalFeedbackAndGenerate,
    acceptMessage,
    canAcceptMessage,
  } = useDiscussionChat(service);
  const [chatModel, setChatModel] = useState<string | null>(null);
  const [modelInitialized, setModelInitialized] = useState(false);

  useEffect(() => {
    if (!modelInitialized && defaultModel !== undefined) {
      setChatModel(defaultModel || "");
      setModelInitialized(true);
    }
  }, [defaultModel, modelInitialized]);

  useEffect(() => {
    generateInitialMessage();
  }, []);

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

  const handleAcceptMessage = async (content: string) => {
    await acceptMessage(content);
    navigate(`/chat/${chatId}`);
  };

  const handleGenerate = async () => {
    const finalFeedback = inputValue.trim() ? inputValue : undefined;
    setInputValue("");
    await sendFinalFeedbackAndGenerate(finalFeedback);
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper
        mt={30}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 80px)",
        }}
      >
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
          canAcceptMessage={canAcceptMessage}
          onAcceptMessage={handleAcceptMessage}
        />

        <DiscussionInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onSendAndGenerate={handleGenerate}
          onKeyDown={handleKeyDown}
          isGenerating={isGenerating}
          hasMessages={messages.length > 0}
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
  canAcceptMessage: boolean;
  onAcceptMessage: (content: string) => void;
}

const DiscussionChatArea: React.FC<DiscussionChatAreaProps> = ({
  messages,
  isGenerating,
  config,
  canAcceptMessage,
  onAcceptMessage,
}) => {
  const firstAssistantIndex = messages.findIndex((m) => m.role === "assistant");
  const showAcceptButton =
    canAcceptMessage &&
    config.acceptMessageLabel &&
    firstAssistantIndex !== -1 &&
    messages.length === 1;

  return (
    <ScrollArea style={{ flex: 1 }} mb="md" offsetScrollbars>
      <Stack gap="sm" p="xs">
        {messages.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            {config.emptyStateText}
          </Text>
        )}
        {messages.map((msg, index) => (
          <React.Fragment key={index}>
            <DiscussionMessageBubble message={msg} config={config} />
            {showAcceptButton && index === firstAssistantIndex && (
              <Box style={{ textAlign: "left" }}>
                <Button
                  size="compact-sm"
                  variant="light"
                  color={config.accentColor}
                  leftSection={<RiCheckLine size={14} />}
                  onClick={() => onAcceptMessage(msg.content)}
                  disabled={isGenerating}
                >
                  {config.acceptMessageLabel}
                </Button>
              </Box>
            )}
          </React.Fragment>
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
};

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
  onSendAndGenerate: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isGenerating: boolean;
  hasMessages: boolean;
  config: DiscussionPageConfig;
}

const DiscussionInput: React.FC<DiscussionInputProps> = ({
  value,
  onChange,
  onSend,
  onSendAndGenerate,
  onKeyDown,
  isGenerating,
  hasMessages,
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
    <Button
      size="md"
      radius="xl"
      variant="filled"
      color={config.accentColor}
      onClick={onSend}
      disabled={!value.trim() || isGenerating}
      leftSection={<RiSendPlane2Line />}
    >
      Send
    </Button>
    <Button
      size="md"
      radius="xl"
      variant="filled"
      color={config.accentColor}
      onClick={onSendAndGenerate}
      disabled={isGenerating || (!value.trim() && !hasMessages)}
      leftSection={<VscRefresh />}
    >
      {config.generateButtonLabel}
    </Button>
  </Group>
);
