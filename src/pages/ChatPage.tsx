import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chat } from "./Chat/Chat";

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  if (!chatId) {
    navigate("/chat");
    return null;
  }

  return <Chat chatId={chatId} />;
};

export default ChatPage;
