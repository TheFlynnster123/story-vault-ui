import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiChat3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiSave3Line,
  RiTreasureMapFill,
  RiPlayLine,
} from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";
import {
  Title,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  ActionIcon,
  Stack,
  TextInput,
  Textarea,
  Text,
  Divider,
  NumberInput,
  Badge,
  Tooltip,
  Checkbox,
  Select,
  Modal,
  Radio,
} from "@mantine/core";
import type { ComboboxData } from "@mantine/core";
import type { Plan } from "../services/Plan";
import {
  DEFAULT_REFRESH_INTERVAL,
  formatRefreshStatus,
  isAutoRefreshDisabled,
} from "../services/Plan";
import type { PlanPreset } from "../services/PlanPreset";
import {
  STORY_PLAN_PRESET_ID,
  STORY_PLAN_BUILT_IN_PRESET,
} from "../services/PlanPreset";
import { usePlanCache } from "../hooks/usePlanCache";
import { usePlanContent } from "../hooks/usePlanContent";
import { usePlanGenerationStatus } from "../hooks/usePlanGenerationStatus";
import { usePlanPresets, getPlanPresetByName } from "../hooks/usePlanPresets";
import { v4 as uuidv4 } from "uuid";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../AI/components/ModelSelect";

const createNewPlan = (): Plan => ({
  id: uuidv4(),
  type: "planning",
  name: "",
  prompt: "",
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  messagesSinceLastUpdate: 0,
  consolidateMessageHistory: false,
  hideOtherPlans: false,
  excludeOwnPlanFromHistory: false,
});

const inputStyles = {
  label: { color: Theme.page.text },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: Theme.plan.border,
    color: Theme.page.text,
  },
};

/**
 * Normalizes Mantine NumberInput values for plan refresh intervals.
 * Empty strings and invalid values fall back to 0, which disables auto-generation.
 */
const normalizeRefreshInterval = (value: string | number): number =>
  Math.max(0, typeof value === "number" ? value : Number(value) || 0);

const getPromptPreview = (prompt: string): string => {
  const collapsed = prompt.replace(/\s+/g, " ").trim();
  if (!collapsed) return "No prompt preview available.";
  if (collapsed.length <= 120) return collapsed;
  return `${collapsed.slice(0, 117)}...`;
};

const normalizePresetName = (name: string) => name.trim().toLowerCase();

export const PlanPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { plans, updatePlanDefinition, addPlan, deletePlan } = usePlanCache(
    chatId!,
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const { isGenerating } = usePlanGenerationStatus(chatId!);

  const planService = d.PlanService(chatId!);

  const handleAddPlan = () => addPlan?.(createNewPlan());

  const handlePlanChange = (
    id: string,
    field: keyof Plan,
    value: string | number | boolean,
  ) => {
    if (field === "refreshInterval" && typeof value !== "boolean") {
      updatePlanDefinition?.(id, field, normalizeRefreshInterval(value));
      return;
    }

    updatePlanDefinition?.(id, field, value);
  };

  const handleApplyPreset = (planId: string, preset: PlanPreset) => {
    updatePlanDefinition?.(planId, "name", preset.name);
    updatePlanDefinition?.(planId, "prompt", preset.prompt);
    updatePlanDefinition?.(planId, "model", preset.model || "");
    updatePlanDefinition?.(planId, "refreshInterval", preset.refreshInterval);
    updatePlanDefinition?.(planId, "consolidateMessageHistory", preset.consolidateMessageHistory);
    updatePlanDefinition?.(planId, "hideOtherPlans", preset.hideOtherPlans);
    updatePlanDefinition?.(planId, "excludeOwnPlanFromHistory", preset.excludeOwnPlanFromHistory);
  };

  const handleGenerateNow = (id: string) => {
    d.PlanGenerationService(chatId!).generatePlanNow(id);
  };

  const handleClearPlan = (id: string) => {
    d.PlanGenerationService(chatId!).clearPlan(id);
  };

  const handleDiscussPlan = async (id: string) => {
    try {
      await planService?.savePendingChanges();
      navigate(`/chat/${chatId}/plan/${id}/discuss`);
    } catch (error) {
      d.ErrorService().log("Failed to save plan changes", error);
    }
  };

  const handleRemovePlan = (id: string) => {
    setPlanToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmRemovePlan = () => {
    if (planToDelete) {
      deletePlan?.(planToDelete);
    }

    setIsConfirmModalOpen(false);
    setPlanToDelete(null);
  };

  const handleGoBack = async () => {
    planService?.savePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={30}>
        <PlanHeader onGoBack={handleGoBack} />

        <Stack>
          <PlanList
            chatId={chatId!}
            plans={plans}
            onAdd={handleAddPlan}
            onChange={handlePlanChange}
            onApplyPreset={handleApplyPreset}
            onGenerateNow={handleGenerateNow}
            onClearPlan={handleClearPlan}
            onDiscuss={handleDiscussPlan}
            onRemove={handleRemovePlan}
            isGenerating={isGenerating}
          />
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmRemovePlan}
        title="Confirm Deletion"
        message="Are you sure you want to delete this plan?"
      />
    </Page>
  );
};

interface PlanHeaderProps {
  onGoBack: () => void;
}

const PlanHeader: React.FC<PlanHeaderProps> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiTreasureMapFill size={24} color={Theme.plan.primary} />
        <Title order={2} fw={400} style={{ color: Theme.plan.primary }}>
          Plans
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.plan.border }} />
  </>
);

interface PlanListProps {
  chatId: string;
  plans: Plan[];
  onAdd: () => void;
  onChange: (
    id: string,
    field: keyof Plan,
    value: string | number | boolean,
  ) => void;
  onApplyPreset: (planId: string, preset: PlanPreset) => void;
  onGenerateNow: (planId: string) => void;
  onClearPlan: (planId: string) => void;
  onDiscuss: (planId: string) => void;
  onRemove: (planId: string) => void;
  isGenerating: (planId: string) => boolean;
}

const PlanList: React.FC<PlanListProps> = ({
  chatId,
  plans,
  onAdd,
  onChange,
  onApplyPreset,
  onGenerateNow,
  onClearPlan,
  onDiscuss,
  onRemove,
  isGenerating,
}) => (
  <Stack>
    <Group justify="space-between">
      <Text fw={500}>Plans</Text>
      <Button
        variant="subtle"
        onClick={onAdd}
        style={{ color: Theme.plan.primary }}
      >
        <RiAddLine /> Add Plan
      </Button>
    </Group>
    {plans.map((plan) => (
      <PlanEditor
        key={plan.id}
        chatId={chatId}
        plan={plan}
        onChange={onChange}
        onApplyPreset={onApplyPreset}
        onGenerateNow={onGenerateNow}
        onClearPlan={onClearPlan}
        onDiscuss={onDiscuss}
        onRemove={onRemove}
        isGenerating={isGenerating(plan.id)}
      />
    ))}
  </Stack>
);

interface PlanEditorProps {
  chatId: string;
  plan: Plan;
  onChange: (
    id: string,
    field: keyof Plan,
    value: string | number | boolean,
  ) => void;
  onApplyPreset: (planId: string, preset: PlanPreset) => void;
  onGenerateNow: (planId: string) => void;
  onClearPlan: (planId: string) => void;
  onDiscuss: (planId: string) => void;
  onRemove: (planId: string) => void;
  isGenerating: boolean;
}

const PlanEditor: React.FC<PlanEditorProps> = ({
  chatId,
  plan,
  onChange,
  onApplyPreset,
  onGenerateNow,
  onClearPlan,
  onDiscuss,
  onRemove,
  isGenerating,
}) => {
  const { presets, savePreset, deletePreset } = usePlanPresets();
  const { getLatestPlanContent } = usePlanContent(chatId);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [selectedOverwritePresetId, setSelectedOverwritePresetId] = useState<
    string | null
  >(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [deletePresetConfirmOpen, setDeletePresetConfirmOpen] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const latestContent = getLatestPlanContent(plan.id);

  const handleRegenerateWithFeedback = () => {
    if (!latestContent) return;
    d.PlanGenerationService(chatId).regeneratePlanFromMessage(
      plan.id,
      latestContent,
      feedbackText.trim() || undefined,
    );
    setFeedbackModalOpen(false);
    setFeedbackText("");
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setFeedbackText("");
  };

  const isUserPresetSelected =
    selectedPresetId !== null && selectedPresetId !== STORY_PLAN_PRESET_ID;

  const overwriteTargetPreset = useMemo(
    () => presets.find((p) => p.id === selectedOverwritePresetId),
    [presets, selectedOverwritePresetId],
  );

  const selectData = useMemo<ComboboxData>(() => {
    const builtInData = [{ value: STORY_PLAN_PRESET_ID, label: "Story Plan" }];
    const userPresetData = presets.map((p) => ({ value: p.id, label: p.name }));

    if (userPresetData.length === 0) return builtInData;

    return [
      ...builtInData,
      { group: "Saved Presets", items: userPresetData },
    ];
  }, [presets]);

  const handlePresetSelect = (presetId: string | null) => {
    if (!presetId) return;

    setSelectedPresetId(presetId);

    if (presetId === STORY_PLAN_PRESET_ID) {
      onApplyPreset(plan.id, STORY_PLAN_BUILT_IN_PRESET);
    } else {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) onApplyPreset(plan.id, preset);
    }
  };

  const openSaveModal = () => {
    setSavePresetName(plan.name);
    setSelectedOverwritePresetId(null);
    setSaveModalOpen(true);
  };

  const handleSavePresetNameChange = (value: string) => {
    setSavePresetName(value);

    if (
      overwriteTargetPreset &&
      normalizePresetName(overwriteTargetPreset.name) !==
        normalizePresetName(value)
    ) {
      setSelectedOverwritePresetId(null);
    }
  };

  const handleOverwritePresetSelect = (preset: PlanPreset) => {
    setSelectedOverwritePresetId(preset.id);
    setSavePresetName(preset.name);
  };

  const getOverwriteCandidate = (): PlanPreset | undefined => {
    if (overwriteTargetPreset) return overwriteTargetPreset;
    return getPlanPresetByName(presets, savePresetName);
  };

  const closeSaveFlows = () => {
    setOverwriteConfirmOpen(false);
    setSaveModalOpen(false);
    setSavePresetName("");
    setSelectedOverwritePresetId(null);
  };

  const buildPresetPayload = (id?: string) => ({
    id,
    name: savePresetName,
    prompt: plan.prompt,
    model: plan.model,
    refreshInterval: plan.refreshInterval,
    consolidateMessageHistory: plan.consolidateMessageHistory,
    hideOtherPlans: plan.hideOtherPlans,
    excludeOwnPlanFromHistory: plan.excludeOwnPlanFromHistory,
  });

  const handleSaveSubmit = async () => {
    const overwriteCandidate = getOverwriteCandidate();

    if (overwriteCandidate) {
      setOverwriteConfirmOpen(true);
      return;
    }

    const saved = await savePreset(buildPresetPayload());
    setSelectedPresetId(saved.id);
    closeSaveFlows();
  };

  const confirmOverwrite = async () => {
    const overwriteCandidate = getOverwriteCandidate();

    if (!overwriteCandidate) {
      setOverwriteConfirmOpen(false);
      return;
    }

    const saved = await savePreset(buildPresetPayload(overwriteCandidate.id));
    setSelectedPresetId(saved.id);
    closeSaveFlows();
  };

  const confirmDeletePreset = async () => {
    if (!selectedPresetId || !isUserPresetSelected) {
      setDeletePresetConfirmOpen(false);
      return;
    }

    await deletePreset(selectedPresetId);
    setSelectedPresetId(null);
    setDeletePresetConfirmOpen(false);
  };

  const canSubmitSave =
    savePresetName.trim().length > 0 || selectedOverwritePresetId !== null;
  const overwriteCandidate = getOverwriteCandidate();
  const selectedPresetLabel =
    selectedPresetId === STORY_PLAN_PRESET_ID
      ? "Story Plan"
      : presets.find((p) => p.id === selectedPresetId)?.name;

  return (
    <Stack gap="sm">
      {/* Preset bar */}
      <Group align="flex-end" wrap="wrap">
        <Select
          label="Load Preset"
          placeholder="Select a preset to load..."
          data={selectData}
          value={selectedPresetId}
          onChange={handlePresetSelect}
          style={{ flex: 1, minWidth: 220 }}
          styles={{
            label: { color: Theme.page.text },
            input: {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: Theme.plan.border,
              color: Theme.page.text,
            },
          }}
        />
        <Button
          variant="light"
          color="blue"
          leftSection={<RiSave3Line size={16} />}
          onClick={openSaveModal}
        >
          Save As
        </Button>
        <Button
          variant="light"
          color="red"
          leftSection={<RiDeleteBinLine size={16} />}
          disabled={!isUserPresetSelected}
          onClick={() => setDeletePresetConfirmOpen(true)}
        >
          Delete Preset
        </Button>
      </Group>

      <TextInput
        label="Name"
        value={plan.name}
        onChange={(e) => onChange(plan.id, "name", e.currentTarget.value)}
        styles={inputStyles}
      />
      <Stack gap={4}>
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500} style={{ color: Theme.page.text }}>
            Plan Prompt
          </Text>
          <Tooltip label="Reset to Story Plan prompt">
            <ActionIcon
              variant="light"
              size="sm"
              onClick={() =>
                onChange(plan.id, "prompt", STORY_PLAN_BUILT_IN_PRESET.prompt)
              }
              color="teal"
            >
              <VscRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Textarea
          value={plan.prompt}
          onChange={(e) => onChange(plan.id, "prompt", e.currentTarget.value)}
          minRows={5}
          autosize
          styles={inputStyles}
        />
      </Stack>
      <ModelSelect
        value={plan.model || ""}
        onChange={(value) => onChange(plan.id, "model", value || "")}
        label="Plan Model"
        withDescription={false}
      />
      <Checkbox
        label="Consolidate Message History"
        checked={plan.consolidateMessageHistory}
        onChange={(e) =>
          onChange(
            plan.id,
            "consolidateMessageHistory",
            e.currentTarget.checked,
          )
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />
      <Checkbox
        label="Hide Other Plans"
        checked={plan.hideOtherPlans}
        onChange={(e) =>
          onChange(plan.id, "hideOtherPlans", e.currentTarget.checked)
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />
      <Checkbox
        label="Exclude Own Plan From History"
        checked={plan.excludeOwnPlanFromHistory}
        onChange={(e) =>
          onChange(
            plan.id,
            "excludeOwnPlanFromHistory",
            e.currentTarget.checked,
          )
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />
      <Group gap="md" align="flex-end">
        <NumberInput
          label="Refresh every N messages"
          description="Set to 0 to disable automatic generation."
          value={plan.refreshInterval}
          onChange={(value) =>
            onChange(
              plan.id,
              "refreshInterval",
              normalizeRefreshInterval(value),
            )
          }
          min={0}
          max={100}
          w={200}
          styles={inputStyles}
        />
        <RefreshStatusBadge plan={plan} />
      </Group>
      <Group gap="sm">
        <Button
          variant="light"
          color="cyan"
          onClick={() => onDiscuss(plan.id)}
          leftSection={<RiChat3Line />}
        >
          Discuss Plan
        </Button>
        {latestContent ? (
          <>
            <Button
              variant="light"
              color="teal"
              onClick={() => onGenerateNow(plan.id)}
              loading={isGenerating}
              leftSection={<RiRefreshLine />}
            >
              Regenerate
            </Button>
            <Button
              variant="light"
              color="violet"
              onClick={() => setFeedbackModalOpen(true)}
              disabled={isGenerating}
              leftSection={<RiRefreshLine />}
            >
              Regenerate with Feedback
            </Button>
            <Button
              variant="light"
              color="orange"
              onClick={() => setClearConfirmOpen(true)}
              disabled={isGenerating}
              leftSection={<RiDeleteBinLine />}
            >
              Clear Plan
            </Button>
          </>
        ) : (
          <Button
            variant="light"
            color="teal"
            onClick={() => onGenerateNow(plan.id)}
            loading={isGenerating}
            leftSection={<RiPlayLine />}
          >
            Generate Now
          </Button>
        )}
        <Button
          variant="outline"
          color="red"
          onClick={() => onRemove(plan.id)}
          leftSection={<RiDeleteBinLine />}
        >
          Delete Plan
        </Button>
      </Group>

      {/* Current Plan Preview */}
      <Box>
        <Button
          variant="subtle"
          size="xs"
          color="teal"
          onClick={() => setContentExpanded(!contentExpanded)}
          leftSection={
            contentExpanded ? (
              <RiArrowUpSLine size={14} />
            ) : (
              <RiArrowDownSLine size={14} />
            )
          }
        >
          {contentExpanded ? "Hide current plan" : "View current plan"}
        </Button>
        <Collapse in={contentExpanded}>
          <Box
            mt="xs"
            p="sm"
            style={{
              backgroundColor: "rgba(0, 131, 143, 0.15)",
              borderLeft: `4px solid ${Theme.plan.primary}`,
              borderRadius: 6,
              fontSize: "small",
              color: Theme.page.text,
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {latestContent ? (
              <ReactMarkdown>{latestContent}</ReactMarkdown>
            ) : (
              <Text size="sm" c="dimmed">
                No plan generated yet.
              </Text>
            )}
          </Box>
        </Collapse>
      </Box>

      <Divider my="sm" style={{ borderColor: Theme.plan.border }} />

      {/* Save As modal */}
      <Modal
        opened={saveModalOpen}
        onClose={closeSaveFlows}
        title="Save plan preset"
      >
        <Stack>
          <TextInput
            label="Preset name"
            placeholder="e.g. Mystery thriller plan"
            value={savePresetName}
            onChange={(e) =>
              handleSavePresetNameChange(e.currentTarget.value)
            }
            autoFocus
          />

          {presets.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Or overwrite an existing preset
              </Text>
              <Stack gap="xs" style={{ maxHeight: 220, overflowY: "auto" }}>
                {presets.map((preset) => {
                  const isSelected = selectedOverwritePresetId === preset.id;

                  return (
                    <Paper
                      key={preset.id}
                      withBorder
                      p="sm"
                      radius="md"
                      onClick={() => handleOverwritePresetSelect(preset)}
                      style={{
                        cursor: "pointer",
                        borderColor: isSelected
                          ? "var(--mantine-color-blue-6)"
                          : undefined,
                      }}
                    >
                      <Group align="flex-start" wrap="nowrap">
                        <Radio
                          checked={isSelected}
                          onChange={() => handleOverwritePresetSelect(preset)}
                          aria-label={`Overwrite ${preset.name}`}
                        />
                        <Stack gap={2} style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>
                            {preset.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {getPromptPreview(preset.prompt)}
                          </Text>
                        </Stack>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No saved presets yet.
            </Text>
          )}

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={closeSaveFlows}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              leftSection={<RiSave3Line size={16} />}
              onClick={handleSaveSubmit}
              disabled={!canSubmitSave}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Overwrite confirm modal */}
      <Modal
        opened={overwriteConfirmOpen}
        onClose={() => setOverwriteConfirmOpen(false)}
        title="Overwrite preset?"
      >
        <Stack>
          <Text size="sm">
            Overwrite "{overwriteCandidate?.name || savePresetName.trim()}" with
            the current plan settings?
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={() => setOverwriteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              leftSection={<RiRefreshLine size={16} />}
              onClick={confirmOverwrite}
            >
              Overwrite
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete preset confirm modal */}
      <Modal
        opened={deletePresetConfirmOpen}
        onClose={() => setDeletePresetConfirmOpen(false)}
        title="Delete preset?"
      >
        <Stack>
          <Text size="sm">
            Delete preset "{selectedPresetLabel}"? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={() => setDeletePresetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              leftSection={<RiDeleteBinLine size={16} />}
              onClick={confirmDeletePreset}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Clear Plan confirm modal */}
      <Modal
        opened={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="Clear plan?"
      >
        <Stack>
          <Text size="sm">
            Remove the current plan from the chat history? The plan definition
            will be kept and can be regenerated at any time.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              leftSection={<RiDeleteBinLine size={16} />}
              onClick={() => {
                onClearPlan(plan.id);
                setClearConfirmOpen(false);
              }}
            >
              Clear Plan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Regenerate with Feedback modal */}
      <Modal
        opened={feedbackModalOpen}
        onClose={closeFeedbackModal}
        title="Regenerate with Feedback"
      >
        <Stack>
          <Text size="sm">
            Describe what you'd like to change, or leave blank to regenerate
            using updated chat history.
          </Text>
          <Textarea
            label="Feedback"
            placeholder="e.g. Focus more on character motivation, add a timeline section..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.currentTarget.value)}
            minRows={3}
            autosize
            autoFocus
            styles={inputStyles}
          />
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={closeFeedbackModal}
            >
              Cancel
            </Button>
            <Button
              color="violet"
              leftSection={<RiRefreshLine size={16} />}
              onClick={handleRegenerateWithFeedback}
            >
              Regenerate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

interface RefreshStatusBadgeProps {
  plan: Plan;
}

const RefreshStatusBadge: React.FC<RefreshStatusBadgeProps> = ({ plan }) => {
  if (isAutoRefreshDisabled(plan)) {
    return (
      <Badge variant="light" color="gray" size="lg" style={{ marginBottom: 2 }}>
        Manual only
      </Badge>
    );
  }

  const remaining = Math.max(
    0,
    plan.refreshInterval - plan.messagesSinceLastUpdate,
  );
  const isDue = remaining === 0;

  return (
    <Badge
      variant="light"
      color={isDue ? "green" : "teal"}
      size="lg"
      style={{ marginBottom: 2 }}
    >
      {isDue
        ? "⟳ Refresh pending"
        : `⟳ ${formatRefreshStatus(plan)} messages until refresh`}
    </Badge>
  );
};
