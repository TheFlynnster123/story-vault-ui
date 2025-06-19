import React, { useState, useEffect, useCallback } from "react";
import {
  useGrokChatAPI,
  type UseGrokChatAPIResult,
} from "../hooks/useGrokChatAPI";
import { ChatInput } from "./ChatInput";
import { ChatMessage, type Message } from "./ChatMessage";
import "./Chat.css";

interface UseChatLogicArgs {
  grokChatApiClient: UseGrokChatAPIResult["grokChatApiClient"];
}

interface UseChatLogicReturn {
  messages: Message[];
  isSendingMessage: boolean;
  chatError: string | null;
  handleSubmit: (messageText: string) => Promise<void>;
}

const useChatLogic = ({
  grokChatApiClient,
}: UseChatLogicArgs): UseChatLogicReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (userMessageText: string) => {
      if (!userMessageText.trim() || isSendingMessage || !grokChatApiClient) {
        if (!grokChatApiClient) {
          setChatError("Chat client is not available.");
        }
        return;
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userMessageText,
      };

      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setIsSendingMessage(true);
      setChatError(null);

      try {
        const systemReplyText = await grokChatApiClient.postChatMessage(
          userMessageText
        );
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          sender: "system",
          text: systemReplyText,
        };
        setMessages((prevMessages) => [...prevMessages, systemMessage]);
      } catch (e: any) {
        console.error("[ChatLogic] Error sending message:", e);
        const errText =
          e.message || "Failed to get a response from the system.";
        setChatError(errText);
        const systemErrorMessage: Message = {
          id: `system-error-${Date.now()}`,
          sender: "system",
          text: errText,
        };
        setMessages((prevMessages) => [...prevMessages, systemErrorMessage]);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      isSendingMessage,
      grokChatApiClient,
      setMessages,
      setIsSendingMessage,
      setChatError,
    ]
  );

  return {
    messages,
    isSendingMessage,
    chatError,
    handleSubmit,
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

export const Chat: React.FC = () => {
  const { grokChatApiClient, isLoadingClient, clientError } = useGrokChatAPI();

  const {
    messages,
    isSendingMessage,
    chatError: chatLogicError,
    handleSubmit,
  } = useChatLogic({ grokChatApiClient });

  const [overallError, setOverallError] = useState<string | null>(null);

  useEffect(() => {
    if (clientError) {
      setOverallError(`Client Error: ${clientError.message}`);
    } else if (chatLogicError) {
      setOverallError(chatLogicError);
    } else {
      setOverallError(null);
    }
  }, [clientError, chatLogicError]);

  const isChatCompletelyDisabled = isLoadingClient || !grokChatApiClient;
  let placeholderText = "Type your message...";

  if (isLoadingClient) {
    placeholderText = "Initializing chat client...";
  } else if (!grokChatApiClient && clientError) {
    placeholderText = "Chat client error. Cannot send messages.";
  } else if (!grokChatApiClient) {
    placeholderText = "Chat client not available. Please authenticate.";
  }

  return (
    <div className="chat-container">
      {isLoadingClient && (
        <p className="loading-client-message">Loading chat client...</p>
      )}

      {!isLoadingClient && clientError && !chatLogicError && (
        <p className="client-error-message">
          Could not initialize chat: {clientError.message}
        </p>
      )}

      <MessageList messages={messages} />
      <ChatInput
        onSubmit={handleSubmit}
        isSending={isSendingMessage}
        isDisabled={isChatCompletelyDisabled}
        placeholder={placeholderText}
      />
      {overallError && <p className="overall-error-message">{overallError}</p>}
    </div>
  );
};
