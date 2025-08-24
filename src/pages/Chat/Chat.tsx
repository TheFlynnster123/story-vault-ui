import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { ChatControls } from "./ChatControls/ChatControls";
import { useChat } from "../../hooks/useChat";
import { useChatSettings } from "../../hooks/queries/useChatSettings";

interface ChatProps {
  chatId: string;
}

export const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const {
    pages,
    deleteMessage,
    deleteMessagesFromIndex,
    regenerateResponse,
    getDeletePreview,
    submitMessage,
    isLoading,
    generateImage,
  } = useChat({
    chatId,
  });

  const { chatSettings } = useChatSettings(chatId);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  return (
    <ChatContainer
      $chatId={chatId}
      $backgroundPhotoBase64={chatSettings?.backgroundPhotoBase64}
    >
      <ChatControls chatId={chatId} />

      <ChatMessageList
        chatId={chatId}
        pages={pages}
        onDeleteMessage={deleteMessage}
        onDeleteFromHere={deleteMessagesFromIndex}
        onRegenerateResponse={regenerateResponse}
        getDeletePreview={getDeletePreview}
      />

      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        onGenerateImage={generateImage}
        isLoading={isLoading}
        placeholder={"Type your message here..."}
      />
    </ChatContainer>
  );
};

const ChatContainer = styled.div.attrs<{
  $chatId: string;
}>((props) => ({
  "data-chatid": props.$chatId,
  className: "chat-container",
}))<{
  $backgroundPhotoBase64?: string;
}>`
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: ${(props) =>
    props.$backgroundPhotoBase64 ? "transparent" : "black"};
  background-image: ${(props) =>
    props.$backgroundPhotoBase64
      ? `url(${props.$backgroundPhotoBase64})`
      : "none"};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;
