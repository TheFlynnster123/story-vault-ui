import { d } from "../../app/Dependencies/Dependencies";
import type { CivitJobChatMessage } from "../../cqrs/UserChatProjection";
import { useCivitJob } from "../../hooks/useCivitJob";
import "./ChatMessage.styled.ts";
import { useState } from "react";
import styled from "styled-components";
import { MessageItem } from "./ChatMessage.styled.ts";

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

export interface CivitJobMessageProps {
  chatId: string;
  message: CivitJobChatMessage;
}

export const CivitJobMessage = ({ chatId, message }: CivitJobMessageProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  let jobId: string;
  try {
    jobId = message?.data?.jobId;
  } catch (e) {
    d.ErrorService().log("Failed to parse jobId from message content", e);
    jobId = "";
  }

  const {
    photoBase64: photoBase64,
    isLoading,
    jobStatus,
  } = useCivitJob(chatId, jobId);

  const getStatusMessage = () => {
    if (isLoading) return "Loading...";
    if (jobStatus?.error) return "Failed to load photo";
    if (jobStatus?.isScheduled) return "Image is being generated...";
    if (!photoBase64) return "No photo available";
    return null;
  };

  const handleDeleteClick = (type: "single" | "fromHere") => {
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === "single") {
      d.ChatService(chatId).DeleteMessage(message.id);
    } else if (deleteType === "fromHere") {
      d.ChatService(chatId).DeleteMessageAndAllBelow(message.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const getConfirmationMessage = () => {
    if (deleteType === "single")
      return "Are you sure you want to delete this message?";
    else
      return `Are you sure you want to delete this message and all messages below it?`;
  };

  const handleMessageClick = () => {
    setShowDeleteButtons(!showDeleteButtons);
  };

  return (
    <MessageItem $type="system">
      <MessageContent onClick={handleMessageClick}>
        {getStatusMessage() && (
          <LoadingBubble>{getStatusMessage()}</LoadingBubble>
        )}
        {photoBase64 && <StoryPhoto src={photoBase64} alt="Story Photo" />}
      </MessageContent>
      {showDeleteButtons && (
        <div className="message-delete-buttons">
          <button
            className="delete-button delete-single"
            onClick={() => handleDeleteClick("single")}
            title="Delete this message"
          >
            🗑️
          </button>
          <button
            className="delete-button delete-from-here"
            onClick={() => handleDeleteClick("fromHere")}
            title="Delete this message and all below"
          >
            🗑️↓
          </button>
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
    </MessageItem>
  );
};
