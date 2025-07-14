import type { Message, MessageItemProps } from "./ChatMessage"; // Assuming we reuse the props
import "./ChatMessage.css"; // Reuse styles or create new if needed

export const CivitJobMessage: React.FC<MessageItemProps> = ({
  message,
  onDeleteMessage,
  onDeleteFromHere,
  getDeletePreview,
}) => {
  // Stub: Render photo or placeholder
  return (
    <div className="message-item message-system">
      <div className="message-content">
        <img src={message.content} alt="Story Photo" className="story-photo" />
        {/* Assuming content is the image URL */}
      </div>
      {/* Add delete buttons similar to ChatMessage if needed */}
    </div>
  );
};
