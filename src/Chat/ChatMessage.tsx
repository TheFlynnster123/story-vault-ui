export interface Message {
  id: string;
  sender: "user" | "system";
  text: string;
}

import "./ChatMessage.css";

export interface MessageItemProps {
  message: Message;
}

export const ChatMessage: React.FC<MessageItemProps> = ({ message }) => {
  const messageClass =
    message.sender === "user" ? "message-user" : "message-system";

  const messageTextStyle = `message-text ${message.sender}`;

  return (
    <div className={`message-item ${messageClass}`}>
      <span className={messageTextStyle}>{message.text}</span>
    </div>
  );
};
