import React, { useState, useCallback } from "react";
import { useGrokChatAPI } from "../hooks/useGrokChatAPI";
import { ChatInput } from "./ChatInput";
import { ChatMessage, type Message } from "./ChatMessage";
import "./Chat.css";

interface UseChatLogicReturn {
  messages: Message[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
}

const useChatLogic = (): UseChatLogicReturn => {
  const { grokChatApiClient } = useGrokChatAPI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  const submitMessage = useCallback(
    async (userMessageText: string) => {
      const userMessage: Message = toUserMessage(userMessageText);

      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setIsSendingMessage(true);

      if (grokChatApiClient === null) return;

      const systemReplyText = await grokChatApiClient.postChatMessage(
        userMessageText
      );

      const systemMessage = toSystemMessage(systemReplyText);
      setMessages((prevMessages) => [...prevMessages, systemMessage]);
      setIsSendingMessage(false);
    },
    [isSendingMessage, grokChatApiClient, setMessages, setIsSendingMessage]
  );

  return {
    messages,
    isSendingMessage,
    submitMessage,
  };
};

interface MessageListProps {
  messages: Message[];
}
const MessageList: React.FC<MessageListProps> = ({ messages }) => (
  <div className="message-list">
    {messages.map((msg) => (
      <ChatMessage key={msg.id} message={msg} />
    ))}
  </div>
);

interface ChatProps {
  chatId: string;
  toggleMenu: () => any;
}

export const Chat: React.FC<ChatProps> = ({ chatId, toggleMenu }) => {
  const { messages, isSendingMessage, submitMessage } = useChatLogic();

  return (
    <div className="chat-container" data-chatid={chatId}>
      <MessageList messages={messages} />
      <ChatInput
        onSubmit={submitMessage}
        isSending={isSendingMessage}
        isDisabled={false}
        placeholder={"Type your message here..."}
        toggleMenu={toggleMenu}
      />
    </div>
  );
};

function toUserMessage(userMessageText: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: userMessageText,
  };
}

function toSystemMessage(systemReplyText: string): Message {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}
