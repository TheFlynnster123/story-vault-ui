import "./ChatMessage.styled.ts";
import { useEffect, useState } from "react";
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
  RiErrorWarningLine,
  RiForbidLine,
} from "react-icons/ri";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay.tsx";
import { RegenerateFeedbackModal } from "./ChatEntryButtons/RegenerateFeedbackModal.tsx";
import { ViewPromptModal } from "./ChatEntryButtons/ViewPromptModal.tsx";
import { ViewImageErrorModal } from "./ChatEntryButtons/ViewImageErrorModal.tsx";
import { DeleteConfirmModal } from "./ChatEntryButtons/DeleteConfirmModal.tsx";
import { InspectMessageButton } from "./ChatEntryButtons/InspectMessageButton.tsx";
import { Theme } from "../../../../../components/Theme";
import type {
  CivitWorkflowChatMessage,
} from "../../../../../services/CQRS/UserChatProjection.ts";
import { useCivitJob } from "../../../../Images/hooks/useCivitJob.ts";
import { d } from "../../../../../services/Dependencies.ts";
import type { WorkflowSchedulingDetails } from "../../../../Images/services/CivitJob.ts";
import {
  formatExpectedCompletion,
  formatQueuePosition,
} from "./CivitJobSchedulingFormatters.ts";

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

const StatusLine = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  line-height: 1.4;
`;

const SchedulingLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  font-size: 0.75rem;
  gap: 0.3rem 0.8rem;
  justify-content: center;
  line-height: 1.35;
  width: 100%;
`;

const PriorityDetail = styled.span`
  color: rgba(208, 191, 255, 0.9);
`;

const QueuePositionDetail = styled.span`
  color: rgba(116, 192, 252, 0.9);
`;

const ExpectedCompletionDetail = styled.span`
  color: rgba(99, 230, 190, 0.9);
`;

const FailedImageIcon = styled.div`
  color: rgba(255, 107, 107, 0.82);
  height: 120px;
  position: relative;
  width: 120px;
`;

const FailedStatusText = styled.span`
  color: #ffa8a8;
  font-size: 1rem;
  font-weight: 800;
`;

const CostLine = styled.div`
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.75rem;
  line-height: 1.35;
  padding-top: 2px;
  text-align: center;
`;

const ModelLine = styled.div`
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.35;
  max-width: 240px;
  overflow-wrap: anywhere;
  text-align: center;
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
        <Loader size="sm" color="white" aria-label="Generating image" />
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

const FailedImageIndicator = () => (
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
      <FailedImageIcon role="img" aria-label="No image generated">
        <RiImageLine size={120} aria-hidden />
        <RiForbidLine
          size={56}
          aria-hidden
          style={{
            bottom: 4,
            color: "#ff6b6b",
            position: "absolute",
            right: 2,
          }}
        />
      </FailedImageIcon>
      <FailedStatusText>Failed</FailedStatusText>
    </Group>
  </LoadingBubble>
);

interface CivitJobMessageProps {
  chatId: string;
  message: CivitWorkflowChatMessage;
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  let workflowId: string;
  try {
    workflowId = message.data.workflowId ?? "";
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
  const cost =
    message.data.costAmount !== undefined
      ? {
          amount: message.data.costAmount,
          currency: message.data.costCurrency,
        }
      : jobStatus?.cost;

  const shouldShowLoadingIndicator = () =>
    !isPendingGeneration && (isLoading || jobStatus?.isLoading);
  const isImageGenerated = () => !!photoBase64;
  const canViewPrompt = !!(
    message.data?.prompt || message.data?.sceneDescription
  );
  const generatedModelName = message.data?.modelName ?? message.data?.modelId;
  const hasGenerationFailed =
    message.data?.generationStatus === "failed" || !!jobStatus?.error;
  const generationError = hasGenerationFailed
    ? (message.data?.generationStatus === "failed"
        ? message.data.generationError
        : jobStatus?.error) || "Image generation failed."
    : undefined;
  const unavailableImageMessage =
    !isPendingGeneration &&
    !hasGenerationFailed &&
    !photoBase64 &&
    !shouldShowLoadingIndicator()
      ? "No photo available"
      : undefined;

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
            >
              <span>Generating...</span>
              <WorkflowSchedulingStatus details={jobStatus?.scheduling} />
            </LoadingImageIndicator>
          )}
          {hasGenerationFailed && <FailedImageIndicator />}
          {isPendingGeneration && !hasGenerationFailed && (
            <GenerationStatusPreview
              status={message.data.generationStatus}
              characterName={message.data.characterName}
              modelName={message.data.modelName}
            />
          )}
          {unavailableImageMessage && (
            <LoadingBubble>{unavailableImageMessage}</LoadingBubble>
          )}
          {photoBase64 && <StoryPhoto src={photoBase64} alt="Story Photo" />}
        </MessageContent>

        <MessageOverlay show={showButtons} onBackdropClick={toggle}>
          <Stack gap="xs" justify="center">
            {hasGenerationFailed && generationError && (
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<RiErrorWarningLine size={14} />}
                onClick={() => setShowErrorModal(true)}
              >
                View Error
              </Button>
            )}
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
                <InspectMessageButton chatId={chatId} messageId={message.id} />
                {generatedModelName && (
                  <ModelLine>Model: {generatedModelName}</ModelLine>
                )}
                <Divider my="xs" />
              </>
            )}
            {!isImageGenerated() && (
              <InspectMessageButton chatId={chatId} messageId={message.id} />
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
            {isImageGenerated() && cost && (
              <CostLine>{formatCost(cost)}</CostLine>
            )}
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

        <ViewImageErrorModal
          opened={showErrorModal}
          error={generationError ?? "Image generation failed."}
          onClose={() => setShowErrorModal(false)}
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

export const WorkflowSchedulingStatus = ({
  details,
}: {
  details?: WorkflowSchedulingDetails;
}) => {
  const [now, setNow] = useState(() => Date.now());
  const expectedCompleteAt = details?.expectedCompleteAt;

  useEffect(() => {
    if (!expectedCompleteAt) return;

    const expectedCompleteAtMs = Date.parse(expectedCompleteAt);
    if (!Number.isFinite(expectedCompleteAtMs)) return;

    let timer: number | undefined;
    const updateNow = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime < expectedCompleteAtMs) {
        timer = window.setTimeout(updateNow, 1000);
      }
    };

    timer = window.setTimeout(updateNow, 1000);
    return () => window.clearTimeout(timer);
  }, [expectedCompleteAt]);

  if (!details) return null;

  const expectedCompletion = formatExpectedCompletion(expectedCompleteAt, now);
  return (
    <SchedulingLine aria-label="Generation scheduling details">
      {details.priority && (
        <PriorityDetail>
          {formatPriority(details.priority)} priority
        </PriorityDetail>
      )}
      {details.precedingJobs !== undefined && (
        <QueuePositionDetail>
          {formatQueuePosition(details.precedingJobs)}
        </QueuePositionDetail>
      )}
      {expectedCompletion && (
        <ExpectedCompletionDetail>
          {expectedCompletion}
        </ExpectedCompletionDetail>
      )}
    </SchedulingLine>
  );
};

const formatPriority = (priority: string): string =>
  `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;

const GenerationStatusPreview = ({
  status,
  characterName,
  modelName,
}: {
  status?: string;
  characterName?: string;
  modelName?: string;
}) => {
  if (status === "missing-character-description") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusLine>
          <StatusHighlight $color="#ffd43b">Needs</StatusHighlight>
          <StatusText>character description for</StatusText>
          <StatusHighlight $color="#74c0fc">
            {characterName ?? "selected character"}
          </StatusHighlight>
        </StatusLine>
      </LoadingImageIndicator>
    );
  }

  if (status === "generating-prompt") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusLine>
          <StatusHighlight $color="#63e6be">Generating</StatusHighlight>
          <StatusText>scene prompt for</StatusText>
          <StatusHighlight $color="#74c0fc">
            {characterName ?? "the scene"}
          </StatusHighlight>
          <StatusText>...</StatusText>
        </StatusLine>
      </LoadingImageIndicator>
    );
  }

  if (status === "submitting") {
    return (
      <LoadingImageIndicator modelName={modelName} characterName={characterName}>
        <StatusLine>
          <StatusHighlight $color="#b197fc">Submitting</StatusHighlight>
          <StatusText>image for generation...</StatusText>
        </StatusLine>
      </LoadingImageIndicator>
    );
  }

  return (
    <LoadingImageIndicator modelName={modelName} characterName={characterName}>
      <StatusLine>
        <StatusHighlight $color="#ffd43b">Determining</StatusHighlight>
        <StatusText>character...</StatusText>
      </StatusLine>
    </LoadingImageIndicator>
  );
};

const formatCost = (cost: { amount: number; currency?: string }): string => {
  const amount = Number.isInteger(cost.amount)
    ? cost.amount.toString()
    : cost.amount.toFixed(2);
  return `${amount}${cost.currency ? ` ${cost.currency}` : ""} Buzz (~${formatEstimatedUsd(cost.amount)})`;
};

const formatEstimatedUsd = (buzzAmount: number): string =>
  `$${(buzzAmount / 1000).toFixed(3)}`;
