import React, { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { ChatControls } from "./ChatControls/ChatControls";
import { useChatFlow } from "../hooks/useChatFlow";
import {
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
} from "../hooks/queries/useChatSettingsQuery";

interface ChatProps {
  chatId: string;
  toggleMenu: () => void;
}

export const Chat: React.FC<ChatProps> = ({ chatId, toggleMenu }) => {
  const {
    pages,
    isSendingMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
  } = useChatFlow({
    chatId,
  });

  const currentChatSettings = useChatSettingsQuery(chatId);
  const updateChatSettingsMutation = useUpdateChatSettingsMutation();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSendingMessage) inputRef.current?.focus();
  }, [isSendingMessage]);

  const handleSettingsUpdated = (updatedSettings: any) => {
    updateChatSettingsMutation.mutate({ chatId, settings: updatedSettings });
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: currentChatSettings?.backgroundPhotoBase64
      ? "transparent"
      : "black",
    backgroundImage: currentChatSettings?.backgroundPhotoBase64
      ? `url(${currentChatSettings.backgroundPhotoBase64})`
      : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  };

  return (
    <div
      className="chat-container"
      data-chatid={chatId}
      style={backgroundStyle}
    >
      <ChatControls
        chatId={chatId}
        toggleMenu={toggleMenu}
        onSettingsUpdated={handleSettingsUpdated}
        currentChatSettings={currentChatSettings}
      />

      <ChatMessageList
        pages={pages}
        onDeleteMessage={deleteMessage}
        onDeleteFromHere={deleteMessagesFromIndex}
        getDeletePreview={getDeletePreview}
      />

      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        isSending={isSendingMessage}
        placeholder={"Type your message here..."}
      />
    </div>
  );
};
