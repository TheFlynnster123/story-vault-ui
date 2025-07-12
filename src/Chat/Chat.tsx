import React, { useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { ChatControls } from "./ChatControls/ChatControls";
import { ChatFlowDialog } from "./ChatFlowDialog";
import { useChatFlow } from "../hooks/useChatFlow";
import {
  useChatSettings,
  useSaveChatSettingsMutation,
} from "../hooks/queries/useChatSettings";

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
  } = useChatFlow({
    chatId,
  });

  const { chatSettings } = useChatSettings(chatId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isChatFlowDialogOpen, setIsChatFlowDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSendingMessage) inputRef.current?.focus();
  }, [isSendingMessage]);

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: chatSettings?.backgroundPhotoBase64
      ? "transparent"
      : "black",
    backgroundImage: chatSettings?.backgroundPhotoBase64
      ? `url(${chatSettings.backgroundPhotoBase64})`
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
        toggleChatFlowDialog={() =>
          setIsChatFlowDialogOpen(!isChatFlowDialogOpen)
        }
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
      <ChatFlowDialog
        isOpen={isChatFlowDialogOpen}
        onCancel={() => setIsChatFlowDialogOpen(false)}
      />
    </div>
  );
};
