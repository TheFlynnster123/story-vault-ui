import "./ChatMessage.styled.ts";
import { useState } from "react";
import styled from "styled-components";
import { MessageItem, MessageContentWrapper } from "./ChatMessage.styled.ts";
import { Stack, Button, Loader, Group, Divider } from "@mantine/core";
import {
  RiDeleteBinLine,
  RiImageLine,
  RiEyeLine,
  RiRefreshLine,
  RiChat3Line,
  RiImageEditLine,
} from "react-icons/ri";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay.tsx";
import { RegenerateFeedbackModal } from "./ChatEntryButtons/RegenerateFeedbackModal.tsx";
import { ViewPromptModal } from "./ChatEntryButtons/ViewPromptModal.tsx";
import { DeleteConfirmModal } from "./ChatEntryButtons/DeleteConfirmModal.tsx";
import { Theme } from "../../../../../components/Theme";
import type {
  CivitJobChatMessage,
  CivitWorkflowChatMessage,
} from "../../../../../services/CQRS/UserChatProjection.ts";
import { useCivitJob } from "../../../../Images/hooks/useCivitJob.ts";
import { d } from "../../../../../services/Dependencies.ts";

const MessageContent = styled.div`
  width: 100%;
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
  background-color: rgba(
    0,
    0,
    0,
    var(--message-transparency, ${Theme.chatEntry.transparency})
  );
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  text-align: center;
  box-sizing: border-box;
  width: clamp(280px, 52vw, 520px);
  max-width: calc(100vw - 32px);
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusText = styled.span`
  color: rgba(255, 255, 255, 0.86);
`;

const StatusHighlight = styled.span<{ $color: string }>`
  color: ${(props) => props.$color};
  font-weight: 700;
`;

const LoadingImageIndicator = ({
  modelName,
  characterName,
  children,
}: {
  modelName?: string;
  characterName?: string;
  children?: React.ReactNode;
}) => (
  <LoadingBubble>
    <Group
      gap="md"
      justify="center"
      style={{
        flexDirection: "column",
        padding: "40px 20px",
        width: "100%",
      }}
    >
      <RiImageLine size={120} />
      <Group gap="sm" justify="center" wrap="wrap">
        <Loader size="sm" color="white" />
        {children ?? <span>Generating...</span>}
      </Group>
      {characterName && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "#74c0fc",
            fontWeight: 700,
          }}
        >
          {characterName}
        </span>
      )}
      {modelName && (
        <span
          style={{
            fontSize: "0.75rem",
            opacity: 0.6,
            overflowWrap: "anywhere",
          }}
        >
          {modelName}
        </span>
      )}
    </Group>
  </LoadingBubble>
);

interface CivitJobMessageProps {
  chatId: string;
  message: CivitJobChatMessage | CivitWorkflowChatMessage;
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

  let workflowId: string;
  try {
    workflowId =
      message.type === "civit-workflow"
        ? (message.data.workflowId ?? "")
        : message.data.jobId;
  } catch (e) {
    d.ErrorService().log("Failed to parse workflowId from message content", e);
    workflowId = "";
  }

  const isPendingGeneration =
    !!message.data?.generationStatus &&
    message.data.generationStatus !== "submitted";

  const {
    photoBase64: photoBase64,
    isLoading,
    jobStatus,
  } = useCivitJob(chatId, isPendingGeneration ? "" : workflowId);

  const shouldShowLoadingIndicator = () =>
    !isPendingGeneration && (isLoading || jobStatus?.isLoading);
  const isImageGenerated = () => !!photoBase64;
  const canViewPrompt = !!(
    message.data?.prompt || message.data?.sceneDescription
  );

  const getErrorMessage = () => {
    if (isPendingGeneration) return null;
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
    d.ImageGenerationService(chatId)?.regenerateImage(message.id);
  };

  const handleSetAsBackground = async () => {
    setShowButtons(false);
    await d.ChatSettingsService(chatId).setBackgroundPhotoWorkflowId(workflowId);
  };

  const handleRegenerateWithFeedback = () => {
    setShowButtons(false);
    setShowFeedbackModal(false);
    d.ImageGenerationService(chatId)?.regenerateImage(message.id, feedback);
    setFeedback("");
  };

  const toggle = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper $fitContent>
        <MessageContent className="message-text" onClick={toggle}>
          {shouldShowLoadingIndicator() && (
            <LoadingImageIndicator
              modelName={message.data?.modelName}
              characterName={message.data?.characterName}
            />
          )}
          {isPendingGeneration && (
            <GenerationStatusPreview
              status={message.data.generationStatus}
              characterName={message.data.characterName}
              error={message.data.generationError}
              modelName={message.data.modelName}
            />
          )}
          {getErrorMessage() && (
            <LoadingBubble>{getErrorMessage()}</LoadingBubble>
          )}
          {photoBase64 && <StoryPhoto src={photoBase64} alt="Story Photo" />}
        </MessageContent>

        <MessageOverlay show={showButtons} onBackdropClick={toggle}>
          <Stack gap="xs" justify="center">
            {canViewPrompt && (
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<RiEyeLine size={14} />}
                onClick={() => setShowPromptModal(true)}
              >
                View Prompt
              </Button>
            )}
            {isImageGenerated() && (
              <>
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
          prompt={message.data?.prompt ?? message.data?.sceneDescription ?? ""}
          characterDescription={message.data?.characterDescription}
          basePrompt={message.data?.basePrompt}
          sceneDescription={message.data?.sceneDescription}
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

const GenerationStatusPreview = ({
  status,
  characterName,
  error,
  modelName,
}: {
  status?: string;
  characterName?: string;
  error?: string;
  modelName?: string;
}) => {
  if (status === "failed") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusHighlight $color="#ff6b6b">Failed</StatusHighlight>
        <StatusText>{error ? `: ${error}` : " to generate image"}</StatusText>
      </LoadingImageIndicator>
    );
  }

  if (status === "missing-character-description") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusHighlight $color="#ffd43b">Needs</StatusHighlight>
        <StatusText> character description for </StatusText>
        <StatusHighlight $color="#74c0fc">
          {characterName ?? "selected character"}
        </StatusHighlight>
      </LoadingImageIndicator>
    );
  }

  if (status === "generating-prompt") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusHighlight $color="#63e6be">Generating</StatusHighlight>
        <StatusText> scene prompt for </StatusText>
        <StatusHighlight $color="#74c0fc">
          {characterName ?? "the scene"}
        </StatusHighlight>
        <StatusText>...</StatusText>
      </LoadingImageIndicator>
    );
  }

  if (status === "submitting") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusHighlight $color="#b197fc">Submitting</StatusHighlight>
        <StatusText> image for generation...</StatusText>
      </LoadingImageIndicator>
    );
  }

  return (
    <LoadingImageIndicator modelName={modelName} characterName={characterName}>
      <StatusHighlight $color="#ffd43b">Determining</StatusHighlight>
      <StatusText> character...</StatusText>
    </LoadingImageIndicator>
  );
};
