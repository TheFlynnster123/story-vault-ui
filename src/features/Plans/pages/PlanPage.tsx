import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileList2Line,
  RiPlayLine,
} from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";
import {
  Title,
  Button,
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
} from "@mantine/core";
import type { Plan } from "../services/Plan";
import {
  DEFAULT_PLAN_PROMPT,
  DEFAULT_PLAN_NAME,
  DEFAULT_REFRESH_INTERVAL,
  formatRefreshStatus,
} from "../services/Plan";
import { usePlanCache } from "../hooks/usePlanCache";
import { usePlanGenerationStatus } from "../hooks/usePlanGenerationStatus";
import { v4 as uuidv4 } from "uuid";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../AI/components/ModelSelect";

const createNewPlan = (): Plan => ({
  id: uuidv4(),
  type: "planning",
  name: DEFAULT_PLAN_NAME,
  prompt: DEFAULT_PLAN_PROMPT,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  messagesSinceLastUpdate: 0,
  consolidateMessageHistory: false,
});

const inputStyles = {
  label: { color: Theme.page.text },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: Theme.plan.border,
    color: Theme.page.text,
  },
};

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
    value: string | number,
  ) => {
    updatePlanDefinition?.(id, field, value);
  };

  const handleResetPrompt = (id: string) => {
    updatePlanDefinition?.(id, "prompt", DEFAULT_PLAN_PROMPT);
  };

  const handleGenerateNow = (id: string) => {
    d.PlanGenerationService(chatId!).generatePlanNow(id);
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
            plans={plans}
            onAdd={handleAddPlan}
            onChange={handlePlanChange}
            onResetPrompt={handleResetPrompt}
            onGenerateNow={handleGenerateNow}
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
        <RiFileList2Line size={24} color={Theme.plan.primary} />
        <Title order={2} fw={400} style={{ color: Theme.plan.primary }}>
          Plan
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.plan.border }} />
  </>
);

interface PlanListProps {
  plans: Plan[];
  onAdd: () => void;
  onChange: (id: string, field: keyof Plan, value: string | number) => void;
  onResetPrompt: (id: string) => void;
  onGenerateNow: (id: string) => void;
  onRemove: (id: string) => void;
  isGenerating: (planId: string) => boolean;
}

const PlanList: React.FC<PlanListProps> = ({
  plans,
  onAdd,
  onChange,
  onResetPrompt,
  onGenerateNow,
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
        plan={plan}
        onChange={onChange}
        onResetPrompt={onResetPrompt}
        onGenerateNow={onGenerateNow}
        onRemove={onRemove}
        isGenerating={isGenerating(plan.id)}
      />
    ))}
  </Stack>
);

interface PlanEditorProps {
  plan: Plan;
  onChange: (id: string, field: keyof Plan, value: string | number) => void;
  onResetPrompt: (id: string) => void;
  onGenerateNow: (id: string) => void;
  onRemove: (id: string) => void;
  isGenerating: boolean;
}

const PlanEditor: React.FC<PlanEditorProps> = ({
  plan,
  onChange,
  onResetPrompt,
  onGenerateNow,
  onRemove,
  isGenerating,
}) => (
  <Stack key={plan.id} gap="sm">
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
        <Tooltip label="Reset to default prompt">
          <ActionIcon
            variant="light"
            size="sm"
            onClick={() => onResetPrompt(plan.id)}
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
    <Group gap="md" align="flex-end">
      <NumberInput
        label="Refresh every N messages"
        value={plan.refreshInterval}
        onChange={(value) =>
          onChange(plan.id, "refreshInterval", Number(value) || 1)
        }
        min={1}
        max={100}
        w={200}
        styles={inputStyles}
      />
      <RefreshStatusBadge plan={plan} />
    </Group>
    <Group gap="sm">
      <Button
        variant="light"
        color="teal"
        onClick={() => onGenerateNow(plan.id)}
        loading={isGenerating}
        leftSection={<RiPlayLine />}
      >
        Generate Now
      </Button>
      <Button variant="outline" color="red" onClick={() => onRemove(plan.id)}>
        <RiDeleteBinLine /> Delete Plan
      </Button>
    </Group>
    <Divider my="sm" style={{ borderColor: Theme.plan.border }} />
  </Stack>
);

interface RefreshStatusBadgeProps {
  plan: Plan;
}

const RefreshStatusBadge: React.FC<RefreshStatusBadgeProps> = ({ plan }) => {
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
