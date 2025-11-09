export interface Message {
  id: string;
  role: "user" | "system" | "assistant" | "civit-job" | "story-photo";
  content: string;
}

import "./ChatMessage.css";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button, Modal, Group, Text } from "@mantine/core";
import {
  RiDeleteBinLine,
  RiDeleteBin6Line,
  RiRefreshLine,
} from "react-icons/ri";

export interface MessageItemProps {
  chatId: string;
  message: Message;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteFromHere?: (messageId: string) => void;
  onRegenerateResponse?: (messageId: string) => void;
  isLastMessage?: boolean;
  getDeletePreview?: (messageId: string) => {
    messageCount: number;
  };
}

export const ChatMessage: React.FC<MessageItemProps> = ({
  message,
  onDeleteMessage,
  onDeleteFromHere,
  onRegenerateResponse,
  isLastMessage,
  getDeletePreview,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  const messageClass =
    message.role === "user" ? "message-user" : "message-system";

  const messageTextStyle = `message-text ${message.role}`;

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
        : { messageCount: 0 };
      return `Are you sure you want to delete this message and all messages below it? This will delete ${preview.messageCount} messages.`;
    }
  };

  const handleRegenerateClick = () => {
    if (onRegenerateResponse) {
      onRegenerateResponse(message.id);
    }
  };

  const handleMessageClick = () => {
    if (
      onDeleteMessage ||
      onDeleteFromHere ||
      (onRegenerateResponse && isLastMessage)
    ) {
      setShowDeleteButtons(!showDeleteButtons);
    }
  };

  const hasActionFunctions =
    onDeleteMessage ||
    onDeleteFromHere ||
    (onRegenerateResponse && isLastMessage);

  return (
    <div className={`message-item ${messageClass}`}>
      <div className="message-content">
        <div
          className={`${messageTextStyle} ${
            hasActionFunctions ? "clickable" : ""
          }`}
          onClick={handleMessageClick}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
      {showDeleteButtons && hasActionFunctions && (
        <Group gap="xs" justify="center" mt="sm">
          {onRegenerateResponse && isLastMessage && (
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<RiRefreshLine size={14} />}
              onClick={handleRegenerateClick}
              styles={{
                root: {
                  backgroundColor: "rgba(34, 139, 230, 0.25)",
                  "&:hover": {
                    backgroundColor: "rgba(34, 139, 230, 0.35)",
                  },
                },
              }}
            >
              Regenerate
            </Button>
          )}
          {onDeleteMessage && (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<RiDeleteBinLine size={14} />}
              onClick={() => handleDeleteClick("single")}
              styles={{
                root: {
                  backgroundColor: "rgba(250, 82, 82, 0.25)",
                  "&:hover": {
                    backgroundColor: "rgba(250, 82, 82, 0.35)",
                  },
                },
              }}
            >
              Delete
            </Button>
          )}
          {onDeleteFromHere && (
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<RiDeleteBin6Line size={14} />}
              onClick={() => handleDeleteClick("fromHere")}
              styles={{
                root: {
                  backgroundColor: "rgba(250, 82, 82, 0.25)",
                  "&:hover": {
                    backgroundColor: "rgba(250, 82, 82, 0.35)",
                  },
                },
              }}
            >
              Delete All Below
            </Button>
          )}
        </Group>
      )}

      <Modal
        opened={showDeleteConfirm}
        onClose={handleCancelDelete}
        title="Confirm Deletion"
        size="sm"
      >
        <Text>{getConfirmationMessage()}</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  );
};
