import { d } from "../../app/Dependencies/Dependencies";
import type { CivitJobChatMessage } from "../../cqrs/UserChatProjection";
import { useCivitJob } from "../../hooks/useCivitJob";
import "./ChatMessage.styled.ts";
import { useState } from "react";
import styled from "styled-components";
import { MessageItem, MessageContentWrapper } from "./ChatMessage.styled.ts";
import { MessageOverlay } from "./ChatMessageButtons/MessageOverlay";
import { Stack, Button, Loader, Group } from "@mantine/core";
import { RiDeleteBinLine, RiImageLine } from "react-icons/ri";
import { DeleteConfirmModal } from "./ChatMessageButtons/DeleteConfirmModal";

const MessageContent = styled.div`
  max-width: 80vw;
  cursor: pointer;

  &.message-text {
    transition: min-height 0.2s ease;
  }
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

const LoadingImageIndicator = () => (
  <LoadingBubble style={{ marginBottom: "8px" }}>
    <Group
      gap="md"
      justify="center"
      style={{ flexDirection: "column", padding: "40px 20px" }}
    >
      <RiImageLine size={120} />
      <Group gap="sm">
        <Loader size="sm" color="white" />
        <span>Image is being generated</span>
      </Group>
    </Group>
  </LoadingBubble>
);

export interface CivitJobMessageProps {
  chatId: string;
  message: CivitJobChatMessage;
}

export const CivitJobMessage = ({ chatId, message }: CivitJobMessageProps) => {
  const [showButtons, setShowButtons] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");

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

  const shouldShowLoadingIndicator = () => isLoading || jobStatus?.isScheduled;

  const getErrorMessage = () => {
    if (jobStatus?.error) return "Failed to load photo";
    if (!photoBase64 && !shouldShowLoadingIndicator())
      return "No photo available";
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

  const toggle = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <MessageContent className="message-text" onClick={toggle}>
          {shouldShowLoadingIndicator() && <LoadingImageIndicator />}
          {getErrorMessage() && (
            <LoadingBubble>{getErrorMessage()}</LoadingBubble>
          )}
          {photoBase64 && <StoryPhoto src={photoBase64} alt="Story Photo" />}
        </MessageContent>

        <MessageOverlay show={showButtons} onBackdropClick={toggle}>
          <Stack gap="xs" justify="center">
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
              leftSection={<RiDeleteBinLine size={14} />}
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
          </Stack>
        </MessageOverlay>

        <DeleteConfirmModal
          opened={showDeleteConfirm}
          deleteType={deleteType}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </MessageContentWrapper>
    </MessageItem>
  );
};
