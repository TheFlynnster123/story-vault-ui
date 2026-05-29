import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiSendPlane2Line,
  RiCheckLine,
  RiCheckDoubleLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiInformationLine,
} from "react-icons/ri";
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
  Collapse,
  UnstyledButton,
  Badge,
  Popover,
} from "@mantine/core";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { ModelSelect } from "../../AI/components/ModelSelect";
import { EditPromptButton } from "../../AI/components/EditPromptButton";
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
    getLLMContext,
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

  const handleEditPrompt = config.promptLink
    ? () => navigate(config.promptLink!)
    : undefined;

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
    <Page padding="xs" width="98vw" minWidth="98vw">
      <Paper
        mt={8}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 80px)",
        }}
      >
        <DiscussionHeader
          config={config}
          onGoBack={handleGoBack}
          onEditPrompt={handleEditPrompt}
        />

        <Box mb="xs">
          <ModelSelect
            value={chatModel}
            onChange={setChatModel}
            ariaLabel="Chat Model"
            emptyValueLabel="Default Chat Model"
            hideLabel
            withDescription={false}
          />
        </Box>

        <DiscussionChatArea
          context={getLLMContext()}
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

const ROLE_COLOR: Record<string, string> = {
  system: "#9370DB",
  user: "#4CAF50",
  assistant: "#2196F3",
};

interface LLMContextPanelProps {
  context: LLMMessage[];
}

const LLMContextPanel: React.FC<LLMContextPanelProps> = ({ context }) => {
  const [open, setOpen] = useState(false);

  return (
    <Box px="xs" pt="xs" pb={open ? "xs" : 0}>
      <UnstyledButton
        onClick={() => setOpen((o) => !o)}
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
            {context.map((msg, i) => (
              <Box
                key={i}
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

interface DiscussionHeaderProps {
  config: DiscussionPageConfig;
  onGoBack: () => void;
  onEditPrompt?: () => void;
}

const DiscussionHeader: React.FC<DiscussionHeaderProps> = ({
  config,
  onGoBack,
  onEditPrompt,
}) => (
  <>
    <Group justify="space-between" align="center" mb="xs">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        {config.icon}
        <Group gap={6} align="center">
          <Title order={2} fw={400} style={{ color: config.primaryColor }}>
            {config.title}
          </Title>
          {config.descriptionInInfoPopover && (
            <DescriptionInfoPopover
              description={config.description}
              color={config.primaryColor}
            />
          )}
        </Group>
      </Group>
      {onEditPrompt && (
        <EditPromptButton onClick={onEditPrompt}>Edit Prompt</EditPromptButton>
      )}
    </Group>
    {!config.descriptionInInfoPopover && (
      <Text size="sm" c="dimmed" mb="xs">
        {config.description}
      </Text>
    )}
    <Divider mb="xs" style={{ borderColor: config.borderColor }} />
  </>
);

interface DescriptionInfoPopoverProps {
  description: string;
  color: string;
}

const DescriptionInfoPopover: React.FC<DescriptionInfoPopoverProps> = ({
  description,
  color,
}) => (
  <Popover width={320} position="bottom-start" withArrow shadow="md">
    <Popover.Target>
      <ActionIcon
        variant="subtle"
        radius="xl"
        size="sm"
        aria-label="Show discussion info"
      >
        <RiInformationLine size={16} color={color} />
      </ActionIcon>
    </Popover.Target>
    <Popover.Dropdown
      style={{
        background: "rgba(18, 18, 24, 0.96)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "10px 12px",
      }}
    >
      <Text size="sm" c={Theme.page.textMuted}>
        {description}
      </Text>
    </Popover.Dropdown>
  </Popover>
);

interface DiscussionChatAreaProps {
  context: LLMMessage[];
  messages: ReadonlyArray<DiscussionMessage>;
  isGenerating: boolean;
  config: DiscussionPageConfig;
  canAcceptMessage: boolean;
  onAcceptMessage: (content: string) => void;
}

const DiscussionChatArea: React.FC<DiscussionChatAreaProps> = ({
  context,
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
    <DiscussionChatSurface>
      <LLMContextPanel context={context} />
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
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
    </DiscussionChatSurface>
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

const DiscussionChatSurface = styled.div`
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

const DISCUSSION_COMPOSER_MIN_HEIGHT = 76;
const DISCUSSION_COMPOSER_BUTTON_GAP = 4;

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
  <Stack gap={DISCUSSION_COMPOSER_BUTTON_GAP} style={{ marginBottom: 0 }}>
    <Group gap={DISCUSSION_COMPOSER_BUTTON_GAP} align="stretch" wrap="nowrap">
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
          wrapper: {
            minHeight: DISCUSSION_COMPOSER_MIN_HEIGHT,
          },
          input: {
            padding: "12px",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            borderColor: config.borderColor,
            color: Theme.page.text,
          },
        }}
      />
      <Box
        style={{
          width: 40,
          minHeight: DISCUSSION_COMPOSER_MIN_HEIGHT,
          display: "grid",
          gridTemplateRows: "1fr 1fr",
          gap: DISCUSSION_COMPOSER_BUTTON_GAP,
        }}
      >
        <ActionIcon
          size="input-md"
          radius="xl"
          variant="filled"
          color={config.accentColor}
          onClick={onSend}
          disabled={!value.trim() || isGenerating}
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
          color={config.accentColor}
          onClick={onSendAndGenerate}
          disabled={isGenerating || (!value.trim() && !hasMessages)}
          aria-label={config.finalFeedbackButtonLabel}
          title={config.finalFeedbackButtonLabel}
          style={{ width: "100%", height: "100%" }}
        >
          <RiCheckDoubleLine />
        </ActionIcon>
      </Box>
    </Group>
  </Stack>
);
