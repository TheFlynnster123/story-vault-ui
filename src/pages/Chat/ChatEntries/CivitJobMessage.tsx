import { d } from "../../../app/Dependencies/Dependencies.ts";
import type { CivitJobChatMessage } from "../../../cqrs/UserChatProjection.ts";
import { useCivitJob } from "../../../hooks/useCivitJob.ts";
import "../ChatMessage.styled.ts";
import { useState } from "react";
import styled from "styled-components";
import { MessageItem, MessageContentWrapper } from "../ChatMessage.styled.ts";
import { MessageOverlay } from "../ChatMessageButtons/MessageOverlay.tsx";
import { Stack, Button, Loader, Group, Divider } from "@mantine/core";
import {
  RiDeleteBinLine,
  RiImageLine,
  RiEyeLine,
  RiRefreshLine,
  RiChat3Line,
  RiImageEditLine,
} from "react-icons/ri";
import { DeleteConfirmModal } from "../ChatMessageButtons/DeleteConfirmModal.tsx";
import { ViewPromptModal } from "../ChatMessageButtons/ViewPromptModal.tsx";
import { RegenerateFeedbackModal } from "../ChatMessageButtons/RegenerateFeedbackModal.tsx";
import { ChatTheme } from "../../../theme/chatTheme.ts";

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
  background-color: rgba(0, 0, 0, ${ChatTheme.chatEntry.transparency});
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

interface CivitJobMessageProps {
  chatId: string;
  message: CivitJobChatMessage;
  isLastMessage: boolean;
}

export const CivitJobMessage = ({
  chatId,
  message,
  isLastMessage,
}: CivitJobMessageProps) => {
  const [showButtons, setShowButtons] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "fromHere">("single");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");

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
  const isImageGenerated = () => !!photoBase64;

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

  const handleRegenerate = () => {
    setShowButtons(false);
    d.ChatGenerationService(chatId)?.regenerateImage(jobId);
  };

  const handleSetAsBackground = async () => {
    setShowButtons(false);
    await d.ChatSettingsService(chatId).setBackgroundPhotoCivitJobId(jobId);
  };

  const handleRegenerateWithFeedback = () => {
    setShowButtons(false);
    setShowFeedbackModal(false);
    d.ChatGenerationService(chatId)?.regenerateImage(jobId, feedback);
    setFeedback("");
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
            {isImageGenerated() && (
              <>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<RiEyeLine size={14} />}
                  onClick={() => setShowPromptModal(true)}
                >
                  View Prompt
                </Button>
                {isLastMessage && (
                  <>
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<RiRefreshLine size={14} />}
                      onClick={handleRegenerate}
                    >
                      Regenerate
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<RiChat3Line size={14} />}
                      onClick={() => setShowFeedbackModal(true)}
                    >
                      Regenerate with Feedback
                    </Button>
                  </>
                )}
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<RiImageEditLine size={14} />}
                  onClick={handleSetAsBackground}
                >
                  Set as Chat Background
                </Button>
                <Divider my="xs" />
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

        <ViewPromptModal
          opened={showPromptModal}
          prompt={message.data?.prompt ?? ""}
          onClose={() => setShowPromptModal(false)}
        />

        <RegenerateFeedbackModal
          opened={showFeedbackModal}
          feedback={feedback}
          onFeedbackChange={setFeedback}
          onSubmit={handleRegenerateWithFeedback}
          onCancel={() => setShowFeedbackModal(false)}
        />
      </MessageContentWrapper>
    </MessageItem>
  );
};
