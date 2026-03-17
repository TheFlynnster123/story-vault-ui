import { useRef } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import { Textarea, ActionIcon, Group, Box, Stack, Loader } from "@mantine/core";
import { SpinningIcon } from "./ChatInput.styled";
import React from "react";
import { useChatInputCache } from "../../hooks/useChatInputCache";
import { useChatGeneration } from "../../hooks/useChatGeneration";
import { useChatInputExpansion } from "../../hooks/useChatInputExpansion";

export const ChatInput: React.FC<ChatInputProps> = ({ chatId }) => {
  const { inputValue, setInputValue, clearInputValue } =
    useChatInputCache(chatId);
  const { isExpanded, expand, minimize } = useChatInputExpansion();
  const {
    generateImage,
    generateResponse,
    isTextLoading,
    isImageLoading,
    status,
  } = useChatGeneration(chatId);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (isTextLoading) return;

    generateResponse(inputValue);
    clearInputValue();
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
        />
      </Group>
    </Box>
  );
};

interface ChatInputProps {
  chatId: string;
}

const SendIcon = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? (
    <SpinningIcon>
      <IoSync style={ICON_STYLE} />
    </SpinningIcon>
  ) : (
    <IoSend style={ICON_STYLE} />
  );

const ImageIcon = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? (
    <Loader size="sm" color={ICON_STYLE.color} />
  ) : (
    <IoCamera style={ICON_STYLE} />
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
  onMinimize,
}: {
  isTextLoading: boolean;
  isImageLoading: boolean;
  onGenerateImage: () => void;
  onSend: () => void;
  onMinimize: () => void;
}) => {
  const handleGenerateImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    onGenerateImage();
  };

  const handleSend = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    onSend();
    onMinimize();
  };

  return (
    <Stack style={{ alignSelf: "center" }} justify="center">
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
        color="blue"
        onMouseDown={handleSend}
        onTouchEnd={handleSend}
        disabled={isTextLoading}
        aria-label={isTextLoading ? "Sending..." : "Send"}
        tabIndex={0}
      >
        <SendIcon isLoading={isTextLoading} />
      </ActionIcon>
    </Stack>
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
