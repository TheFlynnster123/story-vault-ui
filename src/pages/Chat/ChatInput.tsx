import { type FormEvent, forwardRef } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import { Textarea, ActionIcon, Group, Box, Stack } from "@mantine/core";
import { useChatGeneration } from "../../hooks/useChatGeneration";
import { useChatInputCache } from "../../hooks/useChatInputCache";
import { useExpandableTextarea } from "./useExpandableTextarea";
import "./ChatInput.css";

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ chatId }, ref) => {
    const { inputValue, setInputValue, clearInputValue } =
      useChatInputCache(chatId);
    const { isExpanded, handleFocus, handleBlur } = useExpandableTextarea();
    const { generateImage, generateResponse, isLoading, status } =
      useChatGeneration({ chatId });

    const handleSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!inputValue.trim() || isLoading) return;

      generateResponse(inputValue);
      clearInputValue();
    };

    return (
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
        }}
      >
        <Group gap="xs" p="md" align="flex-end">
          <MessageTextarea
            ref={ref}
            value={inputValue}
            onChange={setInputValue}
            placeholder={status ?? "Type your message here..."}
            disabled={isLoading}
            isExpanded={isExpanded}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <ActionButtons
            isLoading={isLoading}
            onGenerateImage={generateImage}
            isExpanded={isExpanded}
          />
        </Group>
      </Box>
    );
  }
);

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
    <IoSync className="spinning" style={ICON_STYLE} />
  ) : (
    <Icon style={ICON_STYLE} />
  );

const MessageTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled: boolean;
    isExpanded: boolean;
    onFocus: () => void;
    onBlur: () => void;
  }
>(
  (
    { value, onChange, placeholder, disabled, isExpanded, onFocus, onBlur },
    ref
  ) => (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      minRows={isExpanded ? 5 : 1}
      autosize
      maxRows={10}
      style={{ flex: 1 }}
      styles={TEXTAREA_STYLES}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  )
);

const ActionButtons = ({
  isLoading,
  onGenerateImage,
  isExpanded,
}: {
  isLoading: boolean;
  onGenerateImage: () => void;
  isExpanded: boolean;
}) => (
  <Stack style={{ alignSelf: "center" }} justify="center">
    {isExpanded && (
      <ActionIcon
        size="input-md"
        radius="xl"
        variant="filled"
        color="blue"
        onClick={onGenerateImage}
        disabled={isLoading}
        aria-label="Generate Image"
      >
        <InputIcon isLoading={isLoading} icon={IoCamera} />
      </ActionIcon>
    )}
    <ActionIcon
      size="input-md"
      radius="xl"
      variant="filled"
      color="blue"
      type="submit"
      disabled={isLoading}
      aria-label={isLoading ? "Sending..." : "Send"}
    >
      <InputIcon isLoading={isLoading} icon={IoSend} />
    </ActionIcon>
  </Stack>
);
