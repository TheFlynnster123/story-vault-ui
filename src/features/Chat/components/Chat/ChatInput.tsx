import { useRef, useState } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import { Textarea, ActionIcon, Group, Box, Stack } from "@mantine/core";
import { SpinningIcon } from "./ChatInput.styled";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useChatInputCache } from "../../hooks/useChatInputCache";
import { useChatGeneration } from "../../hooks/useChatGeneration";
import { useChatInputExpansion } from "../../hooks/useChatInputExpansion";
import { useLongPress } from "../../hooks/useLongPress";
import { SendGuidanceModal } from "./SendGuidanceModal";
import { MissingCharacterDescriptionModal } from "./MissingCharacterDescriptionModal.tsx";

export const ChatInput: React.FC<ChatInputProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const { inputValue, setInputValue, clearInputValue } =
    useChatInputCache(chatId);
  const { isExpanded, expand, minimize } = useChatInputExpansion();
  const {
    generateImage,
    missingCharacterName,
    resolveMissingCharacterDescription,
    dismissMissingCharacterDescription,
    generateResponse,
    isTextLoading,
    isImageLoading,
    status,
  } = useChatGeneration(chatId);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [isResolvingCharacterDescription, setIsResolvingCharacterDescription] =
    useState(false);

  const handleSend = (guidanceText?: string) => {
    if (isTextLoading) return;

    generateResponse(inputValue, guidanceText);
    clearInputValue();
  };

  const handleLongPress = () => {
    setShowGuidanceModal(true);
  };

  const handleGuidanceSubmit = () => {
    handleSend(guidance.trim() ? guidance : undefined);
    setShowGuidanceModal(false);
    setGuidance("");
    minimize();
  };

  const handleGuidanceCancel = () => {
    setShowGuidanceModal(false);
    setGuidance("");
  };

  const runCharacterDescriptionResolution = async (
    resolver: () => Promise<void>,
  ) => {
    setIsResolvingCharacterDescription(true);
    try {
      await resolver();
    } finally {
      setIsResolvingCharacterDescription(false);
    }
  };

  const handleGenerateMissingDescription = async () => {
    await runCharacterDescriptionResolution(async () => {
      await resolveMissingCharacterDescription("generate");
    });
  };

  const handleCreateMissingDescriptionManually = async () => {
    await runCharacterDescriptionResolution(async () => {
      const result = await resolveMissingCharacterDescription("manual");
      if (result === "navigate-to-characters") {
        navigate(`/chat/${chatId}/characters`);
      }
    });
  };

  const handleSkipMissingDescription = async () => {
    await runCharacterDescriptionResolution(async () => {
      await resolveMissingCharacterDescription("skip");
    });
  };

  return (
    <Box
      ref={chatBoxRef}
      onBlur={minimize}
      onFocus={expand}
      style={{
        position: "relative",
        zIndex: 10,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <Group gap="xs" p="md" align="flex-end">
        <MessageTextarea
          value={inputValue}
          onChange={setInputValue}
          placeholder={status ?? "Type your message here..."}
          disabled={isTextLoading}
          isExpanded={isExpanded}
        />
        <ActionButtons
          onMinimize={minimize}
          isTextLoading={isTextLoading}
          isImageLoading={isImageLoading}
          onGenerateImage={generateImage}
          onSend={handleSend}
          onLongPress={handleLongPress}
          isGuidanceMode={showGuidanceModal}
          isExpanded={isExpanded}
        />
      </Group>

      <SendGuidanceModal
        opened={showGuidanceModal}
        guidance={guidance}
        onGuidanceChange={setGuidance}
        onSubmit={handleGuidanceSubmit}
        onCancel={handleGuidanceCancel}
      />

      <MissingCharacterDescriptionModal
        isOpen={!!missingCharacterName}
        characterName={missingCharacterName ?? ""}
        isWorking={isResolvingCharacterDescription}
        onGenerate={handleGenerateMissingDescription}
        onCreateManually={handleCreateMissingDescriptionManually}
        onSkip={handleSkipMissingDescription}
        onCancel={dismissMissingCharacterDescription}
      />
    </Box>
  );
};

interface ChatInputProps {
  chatId: string;
}

const SendIcon = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? <LoadingIcon /> : <IoSend style={ICON_STYLE} />;

const ImageIcon = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? <LoadingIcon /> : <IoCamera style={ICON_STYLE} />;

const LoadingIcon = () => (
  <SpinningIcon>
    <IoSync style={ICON_STYLE} />
  </SpinningIcon>
);

interface MessageTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  isExpanded: boolean;
}

const MessageTextarea: React.FC<MessageTextareaProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  isExpanded,
}) => (
  <Textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    minRows={isExpanded ? 5 : 1}
    autosize
    maxRows={10}
    style={{ flex: 1 }}
    styles={TEXTAREA_STYLES}
  />
);

const ActionButtons = ({
  isTextLoading,
  isImageLoading,
  onGenerateImage,
  onSend,
  onLongPress,
  isGuidanceMode,
  onMinimize,
  isExpanded,
}: {
  isTextLoading: boolean;
  isImageLoading: boolean;
  onGenerateImage: () => void;
  onSend: () => void;
  onLongPress: () => void;
  isGuidanceMode: boolean;
  onMinimize: () => void;
  isExpanded: boolean;
}) => {
  const longPress = useLongPress(onLongPress);

  const handleGenerateImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    onGenerateImage();
  };

  const startSendLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    longPress.start();
  };

  const completeSend = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    longPress.cancel();

    if (!longPress.wasLongPress()) {
      onSend();
      onMinimize();
    }
  };

  const sendButtonColor = isGuidanceMode ? "orange" : "blue";

  const buttons = (
    <>
      <ActionIcon
        size="input-md"
        radius="xl"
        variant="filled"
        color="blue"
        onMouseDown={handleGenerateImage}
        onTouchEnd={handleGenerateImage}
        disabled={isImageLoading}
        aria-label="Generate Image"
        tabIndex={0}
      >
        <ImageIcon isLoading={isImageLoading} />
      </ActionIcon>
      <ActionIcon
        size="input-md"
        radius="xl"
        variant="filled"
        color={sendButtonColor}
        onMouseDown={startSendLongPress}
        onMouseUp={completeSend}
        onTouchStart={startSendLongPress}
        onTouchEnd={completeSend}
        disabled={isTextLoading}
        aria-label={isTextLoading ? "Sending..." : "Send"}
        tabIndex={0}
      >
        <SendIcon isLoading={isTextLoading} />
      </ActionIcon>
    </>
  );

  return isExpanded ? (
    <Stack style={{ alignSelf: "center" }} justify="center">
      {buttons}
    </Stack>
  ) : (
    <Group style={{ alignSelf: "center" }} justify="center" gap="xs">
      {buttons}
    </Group>
  );
};

const ICON_STYLE = {
  width: "50%",
  height: "50%",
  color: "rgba(0, 6, 31, 1)",
};

const TEXTAREA_STYLES = {
  input: {
    padding: "12px",
    backgroundColor: "#0f0f0f",
    color: "#ffffff",
    border: "none",
    boxShadow: "5px 5px 5px rgba(0, 0, 0, 0.5)",
  },
};
