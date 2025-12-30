import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileList2Line,
} from "react-icons/ri";
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
} from "@mantine/core";
import type { Plan } from "../services/ChatGeneration/Plan";
import { usePlanCache } from "../components/Chat/usePlanCache";
import { v4 as uuidv4 } from "uuid";
import { Theme } from "../components/Common/Theme";
import { Page } from "./Page";
import { ConfirmModal } from "../components/Common/ConfirmModal";
import { getPlanServiceInstance } from "../services/ChatGeneration/PlanService";

export const PlanPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { plans, updatePlanDefinition, addPlan, deletePlan } = usePlanCache(
    chatId!
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const planService = getPlanServiceInstance(chatId!);

  const handleAddPlan = (type: Plan["type"]) => {
    const newPlan: Plan = {
      id: uuidv4(),
      type,
      name: `Basic Plan`,
      prompt: "Write a list of key points relevant to the story:",
    };
    addPlan?.(newPlan);
  };

  const handlePlanChange = (id: string, field: keyof Plan, value: string) => {
    updatePlanDefinition?.(id, field, value);
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
    planService?.SavePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  const getPlansByType = (type: Plan["type"]) =>
    plans.filter((plan) => plan.type === type);

  return (
    <Page>
      <Paper mt={30}>
        <PlanHeader onGoBack={handleGoBack} />

        <Stack>
          <PlanSection
            title="Plans"
            type="planning"
            plans={getPlansByType("planning")}
            onAdd={handleAddPlan}
            onChange={handlePlanChange}
            onRemove={handleRemovePlan}
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

interface PlanSectionProps {
  title: string;
  type: Plan["type"];
  plans: Plan[];
  onAdd: (type: Plan["type"]) => void;
  onChange: (id: string, field: keyof Plan, value: string) => void;
  onRemove: (id: string) => void;
}

const PlanSection: React.FC<PlanSectionProps> = ({
  title,
  type,
  plans,
  onAdd,
  onChange,
  onRemove,
}) => (
  <Stack>
    <Group justify="space-between">
      <Text fw={500}>{title}</Text>
      <Button
        variant="subtle"
        onClick={() => onAdd(type)}
        style={{ color: Theme.plan.primary }}
      >
        <RiAddLine /> Add Plan
      </Button>
    </Group>
    {plans.map((plan) => (
      <Stack key={plan.id} gap="sm">
        <TextInput
          label="Name"
          value={plan.name}
          onChange={(e) => onChange(plan.id, "name", e.currentTarget.value)}
          styles={{
            label: { color: Theme.page.text },
            input: {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: Theme.plan.border,
              color: Theme.page.text,
            },
          }}
        />
        <Textarea
          label="Plan Prompt"
          value={plan.prompt}
          onChange={(e) => onChange(plan.id, "prompt", e.currentTarget.value)}
          minRows={5}
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
          variant="outline"
          color="red"
          onClick={() => onRemove(plan.id)}
          style={{ alignSelf: "flex-start" }}
        >
          <RiDeleteBinLine /> Delete Plan
        </Button>
        <Divider my="sm" style={{ borderColor: Theme.plan.border }} />
      </Stack>
    ))}
  </Stack>
);
