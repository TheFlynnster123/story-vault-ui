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

  // Format message content to handle quotes and asterisks
  const formatMessageContent = (content: string) => {
    // First, escape any HTML to prevent XSS
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace text in quotes with styled spans
    let formatted = escaped.replace(
      /"([^"]+)"/g,
      '<span class="quoted-text">"$1"</span>'
    );

    // Replace text in asterisks with styled spans
    formatted = formatted.replace(
      /\*([^*]+)\*/g,
      '<span class="emphasized-text">*$1*</span>'
    );

    return formatted;
  };

  return (
    <div className={`message-item ${messageClass}`}>
      <span
        className={messageTextStyle}
        dangerouslySetInnerHTML={{
          __html: formatMessageContent(message.content),
        }}
      />
    </div>
  );
};
