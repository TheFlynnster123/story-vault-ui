export interface Message {
  id: string;
  role: "user" | "system";
  content: string;
}

import "./ChatMessage.css";

export interface MessageItemProps {
  message: Message;
}

export const ChatMessage: React.FC<MessageItemProps> = ({ message }) => {
  const messageClass =
    message.role === "user" ? "message-user" : "message-system";

  const messageTextStyle = `message-text ${message.role}`;

  return (
    <div className={`message-item ${messageClass}`}>
      <span className={messageTextStyle}>{message.content}</span>
    </div>
  );
};
