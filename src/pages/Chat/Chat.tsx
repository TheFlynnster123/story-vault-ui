import React, { useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { ChatControls } from "./ChatControls/ChatControls";
import { ChatFlowDialog } from "./ChatFlowDialog";
import { useChat } from "../../hooks/useChat";
import { useChatSettings } from "../../hooks/queries/useChatSettings";
import { FirstPersonCharacterPrompt } from "../../templates/FirstPersonCharacterTemplate";
import { toSystemMessage } from "../../utils/messageUtils";

interface ChatProps {
  chatId: string;
  toggleMenu: () => void;
}

export const Chat: React.FC<ChatProps> = ({ chatId, toggleMenu }) => {
  const {
    pages,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    submitMessage,
    isLoading,
    status,
    generateImage,
    addMessage,
  } = useChat({
    chatId,
  });

  const { chatSettings } = useChatSettings(chatId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isChatFlowDialogOpen, setIsChatFlowDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && pages.length === 0 && chatSettings) {
      let prompt = "";
      if (chatSettings.promptType === "First Person Character") {
        prompt = FirstPersonCharacterPrompt;
      } else if (chatSettings.promptType === "Manual") {
        prompt = chatSettings.customPrompt || "";
      }
      if (prompt) {
        addMessage(toSystemMessage(prompt));
      }
    }
  }, [isLoading, pages, chatSettings, addMessage]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

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
        chatId={chatId}
        pages={pages}
        onDeleteMessage={deleteMessage}
        onDeleteFromHere={deleteMessagesFromIndex}
        getDeletePreview={getDeletePreview}
      />

      <ChatFlowDialog
        status={status}
        chatId={chatId}
        isOpen={isChatFlowDialogOpen}
        onCancel={() => setIsChatFlowDialogOpen(false)}
        onOpen={() => setIsChatFlowDialogOpen(true)}
      />
      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        onGenerateImage={generateImage}
        isLoading={isLoading}
        placeholder={"Type your message here..."}
      />
    </div>
  );
};
