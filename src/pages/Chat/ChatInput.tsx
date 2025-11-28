import { useRef } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import { Textarea, ActionIcon, Group, Box, Stack } from "@mantine/core";
import { useChatGeneration } from "../../hooks/useChatGeneration";
import { useChatInputCache } from "../../hooks/useChatInputCache";
import { useChatInputExpansion } from "./useExpandableTextarea";
import { SpinningIcon } from "./ChatInput.styled";
import React from "react";

export const ChatInput: React.FC<ChatInputProps> = ({ chatId }) => {
  const { inputValue, setInputValue, clearInputValue } =
    useChatInputCache(chatId);
  const { isExpanded, expand, minimize } = useChatInputExpansion();
  const { generateImage, generateResponse, isLoading, status } =
    useChatGeneration({ chatId });
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;

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
          disabled={isLoading}
          isExpanded={isExpanded}
        />
        <ActionButtons
          onMinimize={minimize}
          isLoading={isLoading}
          onGenerateImage={generateImage}
          onSend={handleSend}
          isExpanded={isExpanded}
        />
      </Group>
    </Box>
  );
};

export interface ChatInputProps {
  chatId: string;
}

const ICON_STYLE = {
  width: "50%",
  height: "50%",
  color: "rgba(20, 20, 29, 1)",
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

const InputIcon = ({
  isLoading,
  icon: Icon,
}: {
  isLoading: boolean;
  icon: typeof IoCamera;
}) =>
  isLoading ? (
    <SpinningIcon>
      <IoSync style={ICON_STYLE} />
    </SpinningIcon>
  ) : (
    <Icon style={ICON_STYLE} />
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
  isLoading,
  onGenerateImage,
  onSend,
  onMinimize,
  isExpanded,
}: {
  isLoading: boolean;
  onGenerateImage: () => void;
  onSend: () => void;
  onMinimize: () => void;
  isExpanded: boolean;
}) => {
  const handleGenerateImage = () => {
    onGenerateImage();
    onMinimize();
  };

  const handleSend = () => {
    onSend();
    onMinimize();
  };

  return (
    <Stack style={{ alignSelf: "center" }} justify="center">
      {isExpanded && (
        <ActionIcon
          size="input-md"
          radius="xl"
          variant="filled"
          color="blue"
          onMouseDown={handleGenerateImage}
          onTouchStart={handleGenerateImage}
          disabled={isLoading}
          aria-label="Generate Image"
          tabIndex={0}
        >
          <InputIcon isLoading={isLoading} icon={IoCamera} />
        </ActionIcon>
      )}
      <ActionIcon
        size="input-md"
        radius="xl"
        variant="filled"
        color="blue"
        onMouseDown={handleSend}
        onTouchStart={handleSend}
        disabled={isLoading}
        aria-label={isLoading ? "Sending..." : "Send"}
        tabIndex={0}
      >
        <InputIcon isLoading={isLoading} icon={IoSend} />
      </ActionIcon>
    </Stack>
  );
};
