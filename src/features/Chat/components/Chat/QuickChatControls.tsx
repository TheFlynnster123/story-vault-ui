import React, { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  RiBookOpenLine,
  RiSettings3Line,
  RiTreasureMapFill,
} from "react-icons/ri";
import styled from "styled-components";
import { Theme } from "../../../../components/Theme";
import { d } from "../../../../services/Dependencies";
import { usePlanCache } from "../../../Plans/hooks/usePlanCache";
import { usePlanContent } from "../../../Plans/hooks/usePlanContent";
import { usePlanGenerationStatus } from "../../../Plans/hooks/usePlanGenerationStatus";
import { useChapterCreation } from "./ChatControls/ChapterCreationContext";
import { FlowStyles } from "./Flow/FlowStyles";
import { AsyncActionControl } from "./ChatControls/AsyncActionControl";
import { FaUser } from "react-icons/fa";
import { LuSparkles } from "react-icons/lu";
import { useCharacterUpdateProposal } from "../../../Characters/hooks/useCharacterUpdateProposal";
import { CharacterUpdateReviewModal } from "../../../Characters/components/CharacterUpdateReviewModal";
import type { CharacterMaintenanceResult } from "../../../Characters/services/CharacterMaintenanceService";
import { AgentFlowAsyncControl } from "./ChatControls/AgentFlowAsyncControl";

type RegenerationMode = "from-scratch" | "edit";

interface QuickChatControlsProps {
  chatId: string;
}

export const QuickChatControls: React.FC<QuickChatControlsProps> = ({
  chatId,
}) => {
  const [opened, setOpened] = useState(false);
  const chapter = useChapterCreation();
  const { plans } = usePlanCache(chatId);
  const { getLatestPlanContent } = usePlanContent(chatId);
  const { isGenerating } = usePlanGenerationStatus(chatId);
  const [planPickerOpened, setPlanPickerOpened] = useState(false);
  const [modePickerOpened, setModePickerOpened] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<RegenerationMode | null>(
    null,
  );
  const [isSuggestingWorkflowAction, setIsSuggestingWorkflowAction] =
    useState(false);
  const [isPreparingCharacterUpdates, setIsPreparingCharacterUpdates] =
    useState(false);
  const [characterUpdateStatus, setCharacterUpdateStatus] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const characterUpdates = useCharacterUpdateProposal(chatId);

  const handleCompressChapter = () => {
    setOpened(false);
    chapter.handleOpenModal();
  };

  const handleRegeneratePlanClick = () => {
    if (plans.length === 0) return;
    setOpened(false);

    if (plans.length === 1) {
      setSelectedPlanId(plans[0].id);
      setModePickerOpened(true);
      return;
    }

    setPlanPickerOpened(true);
  };

  const handleSuggestWorkflowAction = async () => {
    setOpened(false);
    setIsSuggestingWorkflowAction(true);

    try {
      await d.AgentFlowService(chatId).analyzeIntentSuggestion();
    } catch (error) {
      d.ErrorService().log("Failed to suggest workflow action", error);
    } finally {
      setIsSuggestingWorkflowAction(false);
    }
  };

  const handlePrepareCharacterUpdates = async () => {
    setOpened(false);
    setCharacterUpdateStatus(undefined);
    setIsPreparingCharacterUpdates(true);

    try {
      const result = await d
        .CharacterMaintenanceService(chatId)
        .synchronizeNow();
      setCharacterUpdateStatus(toCharacterUpdateStatus(result));
    } catch (error) {
      d.ErrorService().log("Failed to prepare character updates", error);
      setCharacterUpdateStatus("Character updates could not be prepared.");
    } finally {
      setIsPreparingCharacterUpdates(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setPlanPickerOpened(false);
    setModePickerOpened(true);
  };

  const handleSelectMode = (mode: RegenerationMode) => {
    setSelectedMode(mode);
    setFeedback("");
  };

  const closeRegenerationModals = () => {
    setPlanPickerOpened(false);
    setModePickerOpened(false);
    setSelectedPlanId(null);
    setSelectedMode(null);
    setFeedback("");
  };

  const handleRegeneratePlan = async () => {
    if (!selectedPlanId || !selectedMode) return;

    const latestContent = getLatestPlanContent(selectedPlanId);

    try {
      if (selectedMode === "from-scratch") {
        await d.PlanGenerationService(chatId).generatePlanNow(selectedPlanId);
      }

      if (selectedMode === "edit") {
        await d
          .PlanGenerationService(chatId)
          .regeneratePlanFromMessage(
            selectedPlanId,
            latestContent,
            feedback.trim() || undefined,
          );
      }

      closeRegenerationModals();
    } catch (error) {
      d.ErrorService().log("Failed to regenerate plan", error);
    }
  };

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedPlanIsGenerating = selectedPlanId
    ? isGenerating(selectedPlanId)
    : false;
  const selectedPlanLatestContent = selectedPlanId
    ? getLatestPlanContent(selectedPlanId)
    : undefined;
  const canSubmitRegeneration =
    !!selectedPlanId &&
    !!selectedMode &&
    !selectedPlanIsGenerating &&
    (selectedMode !== "edit" || !!selectedPlanLatestContent);

  return (
    <>
      <ControlsContainer>
        <Stack gap="xs" align="flex-end">
          <Tooltip label="Quick Chat Controls">
            <ActionIcon
              aria-label="Quick Chat Controls"
              onClick={() => setOpened(true)}
              size="xl"
              variant="subtle"
              styles={{
                root: {
                  backgroundColor: "rgba(92, 92, 92, 0.42)",
                  color: "#e5e5e5",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(190, 190, 190, 0.28)",
                  "&:hover": {
                    backgroundColor: "rgba(112, 112, 112, 0.52)",
                  },
                },
              }}
            >
              <RiSettings3Line size={20} />
            </ActionIcon>
          </Tooltip>
          {chapter.pendingDraftStatus &&
            chapter.pendingDraftStatus !== "generating" && (
              <AsyncActionControl
                label={
                  chapter.pendingDraftStatus === "failed"
                    ? "Retry chapter draft"
                    : "Review chapter draft"
                }
                icon={<RiBookOpenLine size={20} />}
                theme={Theme.chapter}
                onClick={chapter.handlePendingDraft}
              />
            )}
          {characterUpdates.proposal && (
            <AsyncActionControl
              label="Review character updates"
              icon={<FaUser size={18} />}
              theme={Theme.character}
              onClick={characterUpdates.openReview}
            />
          )}
          <AgentFlowAsyncControl chatId={chatId} />
        </Stack>
      </ControlsContainer>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Quick Chat Controls"
        size="md"
      >
        <Stack gap="sm">
          <QuickActionButton
            icon={<RiBookOpenLine size={18} color={Theme.chapter.primary} />}
            title="Compress chapter"
            description="Create a chapter from the current conversation."
            onClick={handleCompressChapter}
          />

          <QuickActionButton
            icon={<LuSparkles size={18} color={Theme.plan.primary} />}
            title="Suggest Workflow Action"
            description="Analyze the conversation and suggest the next workflow action."
            loading={isSuggestingWorkflowAction}
            onClick={handleSuggestWorkflowAction}
          />

          <QuickActionButton
            icon={<FaUser size={16} color={Theme.character.primary} />}
            title="Prepare Character Sheet Updates"
            description={
              characterUpdates.proposal
                ? "Review or discard the pending character updates first."
                : "Analyze the active cast and prepare Character Sheet changes for approval."
            }
            loading={isPreparingCharacterUpdates}
            disabled={Boolean(characterUpdates.proposal)}
            onClick={handlePrepareCharacterUpdates}
          />

          {characterUpdateStatus && (
            <Text size="xs" c="dimmed">
              {characterUpdateStatus}
            </Text>
          )}

          <Stack gap="xs">
            <Button
              variant="light"
              color="gray"
              disabled={plans.length === 0}
              onClick={handleRegeneratePlanClick}
              leftSection={
                <RiTreasureMapFill size={16} color={Theme.plan.primary} />
              }
              justify="flex-start"
              styles={quickButtonStyles}
            >
              {plans.length === 0 ? "No plans available" : "Regenerate plan"}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        opened={planPickerOpened}
        onClose={closeRegenerationModals}
        title="Which plan?"
        size="sm"
      >
        <Stack gap="xs">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              variant="light"
              color="gray"
              loading={isGenerating(plan.id)}
              disabled={plans.some((p) => isGenerating(p.id))}
              onClick={() => handleSelectPlan(plan.id)}
              leftSection={
                <RiTreasureMapFill size={16} color={Theme.plan.primary} />
              }
              justify="flex-start"
              styles={quickButtonStyles}
            >
              {plan.name}
            </Button>
          ))}
        </Stack>
      </Modal>

      <Modal
        opened={modePickerOpened}
        onClose={closeRegenerationModals}
        title="How should it be regenerated?"
        size="lg"
      >
        <Stack gap="md">
          {selectedPlan && (
            <Text size="sm" c="dimmed">
              {selectedPlan.name}
            </Text>
          )}

          <Group grow align="stretch" wrap="wrap">
            <ModeButton
              active={selectedMode === "from-scratch"}
              title="From Scratch"
              description="Build a fresh plan from chat history."
              onClick={() => handleSelectMode("from-scratch")}
            />
            <ModeButton
              active={selectedMode === "edit"}
              title="Edit"
              description="Revise the current plan."
              disabled={!selectedPlanLatestContent}
              onClick={() => handleSelectMode("edit")}
            />
          </Group>

          {selectedMode === "edit" && !selectedPlanLatestContent && (
            <Text size="xs" c="red">
              This plan does not have existing content to edit.
            </Text>
          )}

          <Textarea
            label="Feedback"
            placeholder="Optional. Describe what should change..."
            value={feedback}
            onChange={(event) => setFeedback(event.currentTarget.value)}
            minRows={6}
            autosize
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeRegenerationModals}>
              Cancel
            </Button>
            <Button
              color="gray"
              onClick={handleRegeneratePlan}
              loading={selectedPlanIsGenerating}
              disabled={!canSubmitRegeneration}
            >
              Regenerate
            </Button>
          </Group>
        </Stack>
      </Modal>

      <CharacterUpdateReviewModal
        proposal={characterUpdates.proposal}
        opened={characterUpdates.isReviewOpen}
        isApplying={characterUpdates.isApplying}
        error={characterUpdates.error}
        onClose={characterUpdates.closeReview}
        onApprove={characterUpdates.approve}
        onDiscard={characterUpdates.discard}
      />
    </>
  );
};

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  title,
  description,
  loading = false,
  disabled = false,
  onClick,
}) => (
  <Button
    variant="subtle"
    color="gray"
    onClick={onClick}
    loading={loading}
    disabled={disabled}
    h="auto"
    py="sm"
    justify="flex-start"
    leftSection={icon}
    styles={quickButtonStyles}
  >
    <Box ta="left" w="100%">
      <Stack gap={2} align="flex-start">
        <Text size="sm" fw={600}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Box>
  </Button>
);

interface ModeButtonProps {
  active: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}

const ModeButton: React.FC<ModeButtonProps> = ({
  active,
  title,
  description,
  disabled = false,
  onClick,
}) => (
  <Button
    variant="subtle"
    color="gray"
    disabled={disabled}
    onClick={onClick}
    h="auto"
    py="md"
    styles={{
      root: {
        ...quickButtonStyles.root,
        flex: "1 1 180px",
        minWidth: 0,
        whiteSpace: "normal",
        overflow: "visible",
        borderColor: active ? Theme.plan.border : quickButtonStyles.root.border,
        backgroundColor: active
          ? "rgba(0, 188, 212, 0.12)"
          : quickButtonStyles.root.backgroundColor,
      },
      label: {
        whiteSpace: "normal",
        minWidth: 0,
        width: "100%",
      },
      inner: {
        whiteSpace: "normal",
        minWidth: 0,
        width: "100%",
      },
    }}
  >
    <Stack gap={4} align="flex-start" w="100%">
      <Text
        size="sm"
        fw={600}
        ta="left"
        style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
      >
        {title}
      </Text>
      <Text size="xs" c="dimmed" ta="left" style={{ whiteSpace: "normal" }}>
        {description}
      </Text>
    </Stack>
  </Button>
);

const quickButtonStyles = {
  root: {
    backgroundColor: FlowStyles.buttonBackground,
    border: `1px solid ${FlowStyles.border}`,
    color: FlowStyles.text,
    "&:hover": {
      backgroundColor: FlowStyles.buttonHover,
    },
  },
  section: {
    color: FlowStyles.text,
  },
};

const toCharacterUpdateStatus = (
  result: CharacterMaintenanceResult,
): string => {
  if (result.status === "proposal-created") {
    return "Character updates are ready. Close this menu to review them.";
  }
  if (result.status === "unchanged") {
    return "No Character Sheet changes were proposed.";
  }
  if (result.reason === "pending-approval") {
    return "Review or discard the pending character updates first.";
  }
  return "Character updates could not be prepared.";
};

const ControlsContainer = styled.div`
  position: fixed;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1000;
`;
