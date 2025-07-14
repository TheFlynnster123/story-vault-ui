export interface Message {
  id: string;
  role: "user" | "system" | "assistant" | "civit-job" | "story-photo";
  content: string;
}

import "./ChatMessage.css";
import { useState } from "react";

export interface MessageItemProps {
  message: Message;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteFromHere?: (messageId: string) => void;
  getDeletePreview?: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
}

export const ChatMessage: React.FC<MessageItemProps> = ({
  message,
  onDeleteMessage,
  onDeleteFromHere,
  getDeletePreview,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

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

  const handleDeleteClick = (type: "single" | "fromHere") => {
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === "single" && onDeleteMessage) {
      onDeleteMessage(message.id);
    } else if (deleteType === "fromHere" && onDeleteFromHere) {
      onDeleteFromHere(message.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const getConfirmationMessage = () => {
    if (deleteType === "single") {
      return "Are you sure you want to delete this message?";
    } else {
      const preview = getDeletePreview
        ? getDeletePreview(message.id)
        : { messageCount: 0, pageCount: 0 };
      return `Are you sure you want to delete this message and all messages below it? This will delete ${preview.messageCount} messages across ${preview.pageCount} pages.`;
    }
  };

  const handleMessageClick = () => {
    if (onDeleteMessage || onDeleteFromHere) {
      setShowDeleteButtons(!showDeleteButtons);
    }
  };

  const hasDeleteFunctions = onDeleteMessage || onDeleteFromHere;

  return (
    <div className={`message-item ${messageClass}`}>
      <div className="message-content">
        <span
          className={`${messageTextStyle} ${
            hasDeleteFunctions ? "clickable" : ""
          }`}
          dangerouslySetInnerHTML={{
            __html: formatMessageContent(message.content),
          }}
          onClick={handleMessageClick}
        />
      </div>
      {showDeleteButtons && hasDeleteFunctions && (
        <div className="message-delete-buttons">
          {onDeleteMessage && (
            <button
              className="delete-button delete-single"
              onClick={() => handleDeleteClick("single")}
              title="Delete this message"
            >
              🗑️
            </button>
          )}
          {onDeleteFromHere && (
            <button
              className="delete-button delete-from-here"
              onClick={() => handleDeleteClick("fromHere")}
              title="Delete this message and all below"
            >
              🗑️↓
            </button>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-dialog">
            <p>{getConfirmationMessage()}</p>
            <div className="delete-confirmation-buttons">
              <button
                className="confirm-delete-button"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                className="cancel-delete-button"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
