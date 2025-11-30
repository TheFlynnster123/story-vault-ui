import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileList2Line,
} from "react-icons/ri";
import {
  Container,
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
import type { Plan } from "../models/Plan";
import { usePlanCache } from "../hooks/usePlanCache";
import { v4 as uuidv4 } from "uuid";
import { ConfirmModal } from "../components/ConfirmModal";
import { ChatTheme } from "../theme/chatTheme";

export const PlanPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { plans, updatePlanDefinition, addPlan, removePlan, savePlans } =
    usePlanCache(chatId!);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

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
      removePlan?.(planToDelete);
    }
    setIsConfirmModalOpen(false);
    setPlanToDelete(null);
  };

  const handleSave = async () => {
    await savePlans?.();
    navigate(`/chat/${chatId}`);
  };

  const handleGoBack = () => {
    navigate(`/chat/${chatId}`);
  };

  const getPlansByType = (type: Plan["type"]) =>
    plans.filter((plan) => plan.type === type);

  return (
    <Container size="md" miw="70vw" my="xl">
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        p="xl"
        style={{
          background: ChatTheme.page.paperBackground,
          backdropFilter: ChatTheme.page.backdropBlur,
          color: ChatTheme.page.text,
        }}
      >
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
    </Container>
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
          <RiArrowLeftLine color={ChatTheme.page.text} />
        </ActionIcon>
        <RiFileList2Line size={24} color={ChatTheme.plan.primary} />
        <Title order={2} fw={400} style={{ color: ChatTheme.plan.primary }}>
          Plan
        </Title>
      </Group>
      <Button type="submit">Save Changes</Button>
    </Group>
    <Divider mb="xl" style={{ borderColor: ChatTheme.plan.border }} />
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
        style={{ color: ChatTheme.plan.primary }}
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
            label: { color: ChatTheme.page.text },
            input: {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: ChatTheme.plan.border,
              color: ChatTheme.page.text,
            },
          }}
        />
        <Textarea
          label="Plan Prompt"
          value={plan.prompt}
          onChange={(e) => onChange(plan.id, "prompt", e.currentTarget.value)}
          minRows={5}
          styles={{
            label: { color: ChatTheme.page.text },
            input: {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: ChatTheme.plan.border,
              color: ChatTheme.page.text,
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
        <Divider my="sm" style={{ borderColor: ChatTheme.plan.border }} />
      </Stack>
    ))}
  </Stack>
);
