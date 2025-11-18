import "./ChatMessage.css";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button, Modal, Group, Text, Textarea, Stack } from "@mantine/core";
import {
  RiDeleteBinLine,
  RiDeleteBin6Line,
  RiRefreshLine,
} from "react-icons/ri";
import { useChatGeneration } from "../../hooks/useChatGeneration";
import { useChatCache } from "../../hooks/useChatCache";
import type { Message } from "../../models/ChatMessages/Messages";

export interface MessageItemProps {
  chatId: string;
  message: Message;
  isLastMessage: boolean;
}

export const ChatMessage: React.FC<MessageItemProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { getDeletePreview, deleteMessage, deleteMessagesAfterIndex } =
    useChatCache(chatId);
  const { regenerateResponse, regenerateResponseWithFeedback } =
    useChatGeneration({
      chatId,
    });

  const messageClass =
    message.role === "user" ? "message-user" : "message-system";

  const messageTextStyle = `message-text ${message.role}`;

  const handleDeleteClick = (type: "single" | "fromHere") => {
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === "single") {
      deleteMessage(message.id);
    } else if (deleteType === "fromHere") {
      deleteMessagesAfterIndex(message.id);
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
    regenerateResponse(message.id);
  };

  const handleRegenerateWithFeedbackClick = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      regenerateResponseWithFeedback(message.id, feedback);
    } else {
      regenerateResponse(message.id);
    }
    setShowFeedbackModal(false);
    setFeedback("");
  };

  const handleFeedbackCancel = () => {
    setShowFeedbackModal(false);
    setFeedback("");
  };

  const handleMessageClick = () => {
    setShowDeleteButtons(!showDeleteButtons);
  };

  const hasActionFunctions = isLastMessage;

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
      {showDeleteButtons && (
        <Group gap="xs" justify="center" mt="sm">
          {isLastMessage && (
            <>
              <Button
                size="xs"
                variant="light"
                color="blue"
                onClick={handleRegenerateClick}
                styles={{
                  root: {
                    backgroundColor: "rgba(34, 139, 230, 0.25)",
                    "&:hover": {
                      backgroundColor: "rgba(34, 139, 230, 0.35)",
                    },
                    minWidth: "36px",
                    padding: "0 8px",
                  },
                }}
                title="Regenerate"
              >
                <RiRefreshLine size={16} />
              </Button>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<RiRefreshLine size={14} />}
                onClick={handleRegenerateWithFeedbackClick}
                styles={{
                  root: {
                    backgroundColor: "rgba(34, 139, 230, 0.25)",
                    "&:hover": {
                      backgroundColor: "rgba(34, 139, 230, 0.35)",
                    },
                  },
                }}
              >
                With Feedback
              </Button>
            </>
          )}
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

      <Modal
        opened={showFeedbackModal}
        onClose={handleFeedbackCancel}
        title="Regenerate with Feedback"
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Provide feedback to guide the regeneration. If left blank, the
            response will be regenerated without additional context.
          </Text>
          <Textarea
            placeholder="Enter your feedback here..."
            value={feedback}
            onChange={(e) => setFeedback(e.currentTarget.value)}
            minRows={4}
            autoFocus
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleFeedbackCancel}>
              Cancel
            </Button>
            <Button color="blue" onClick={handleFeedbackSubmit}>
              Regenerate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};
