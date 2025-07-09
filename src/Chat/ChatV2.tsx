import React, { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageListV2 } from "./ChatMessageListV2";
import { ChatControls } from "./ChatControls";
import { useChatFlowV2 } from "../hooks/useChatFlowV2";
import {
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
} from "../hooks/queries/useChatSettingsQuery";

interface ChatV2Props {
  chatId: string;
  toggleMenu: () => void;
}

export const ChatV2: React.FC<ChatV2Props> = ({ chatId, toggleMenu }) => {
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
    currentState,
    error,
    deleteNotes,
    reset,
  } = useChatFlowV2({
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

      {/* Display error if present */}
      {error && (
        <div
          className="error-status"
          style={{ color: "red", padding: "10px", textAlign: "center" }}
        >
          Error: {error}
          <button onClick={reset} style={{ marginLeft: "10px" }}>
            Reset
          </button>
        </div>
      )}

      {/* Display current state for debugging */}
      {currentState !== "idle" && currentState !== "complete" && (
        <div
          className="state-indicator"
          style={{
            padding: "5px",
            textAlign: "center",
            fontSize: "12px",
            opacity: 0.7,
          }}
        >
          State: {currentState}
        </div>
      )}

      <ChatMessageListV2
        pages={pages}
        chatFlowHistory={chatFlowHistory}
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
        placeholder={"Type your message here... (ChatFlow v2)"}
      />
    </div>
  );
};
