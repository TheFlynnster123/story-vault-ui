import { d } from "../../app/Dependencies/Dependencies";
import { useCivitJob } from "../../hooks/useCivitJob";
import type { MessageItemProps } from "./ChatMessage";
import "./ChatMessage.css";
import { useState } from "react";
import styled from "styled-components";

const MessageContent = styled.div`
  max-width: 80vw;
`;

const StoryPhoto = styled.img`
  max-width: 100%;
  height: auto;
`;

const LoadingBubble = styled.div`
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  text-align: center;
`;

export const CivitJobMessage: React.FC<MessageItemProps> = ({
  chatId,
  message,
  onDeleteMessage,
  onDeleteFromHere,
  getDeletePreview,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  let jobId: string;
  try {
    const contentJson = JSON.parse(message.content);
    jobId = contentJson.jobId;
  } catch (e) {
    d.ErrorService().log("Failed to parse jobId from message content", e);
    jobId = "";
  }

  const { data: photoBase64, isLoading } = useCivitJob(chatId, jobId);

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
    <div className="message-item message-system">
      <MessageContent onClick={handleMessageClick}>
        {(isLoading || !photoBase64) && (
          <LoadingBubble>Loading photo...</LoadingBubble>
        )}
        {photoBase64 && <StoryPhoto src={photoBase64} alt="Story Photo" />}
      </MessageContent>
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
