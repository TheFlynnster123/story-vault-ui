import React, { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { useChatFlow } from "../hooks/useChatFlow";
import { useChatSettings } from "../hooks/useChatSettings";
import { ChatLoadingSpinner } from "../components/common/LoadingSpinner";

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
    progressStatus,
    chatFlowHistory,
    preResponseNotes,
    postResponseNotes,
    deleteNotes,
  } = useChatFlow({
    chatId,
  });
  const { chatSettings, loadChatSettings } = useChatSettings();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSendingMessage) inputRef.current?.focus();
  }, [isSendingMessage]);

  useEffect(() => {
    loadChatSettings(chatId);
  }, [chatId, loadChatSettings]);

  if (isLoadingHistory) return <ChatLoadingSpinner />;

  const currentChatSettings = chatSettings[chatId];
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
      <ChatMessageList
        pages={pages}
        toggleMenu={toggleMenu}
        chatFlowHistory={chatFlowHistory}
        preResponseNotes={preResponseNotes}
        postResponseNotes={postResponseNotes}
        onDeleteMessage={deleteMessage}
        onDeleteFromHere={deleteMessagesFromIndex}
        getDeletePreview={getDeletePreview}
        onDeleteNotes={deleteNotes}
      />
      {progressStatus && (
        <div className="progress-status">{progressStatus}</div>
      )}
      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        isSending={isSendingMessage}
        placeholder={"Type your message here..."}
      />
    </div>
  );
};
