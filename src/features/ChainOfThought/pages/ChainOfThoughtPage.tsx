import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiBrainLine,
  RiPlayLine,
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
  Checkbox,
} from "@mantine/core";
import type { ChainOfThought, ChainOfThoughtStep } from "../services/ChainOfThought";
import {
  DEFAULT_CHAIN_OF_THOUGHT_NAME,
  DEFAULT_CHAIN_OF_THOUGHT_STEPS,
} from "../services/ChainOfThought";
import { useChainOfThoughtCache } from "../hooks/useChainOfThoughtCache";
import { useChainOfThoughtGenerationStatus } from "../hooks/useChainOfThoughtGenerationStatus";
import { v4 as uuidv4 } from "uuid";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../AI/components/ModelSelect";

const createNewChainOfThought = (): ChainOfThought => ({
  id: uuidv4(),
  name: DEFAULT_CHAIN_OF_THOUGHT_NAME,
  steps: DEFAULT_CHAIN_OF_THOUGHT_STEPS.map((step) => ({
    ...step,
    id: uuidv4(),
  })),
});

const inputStyles = {
  label: { color: Theme.page.text },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: Theme.chainOfThought.border,
    color: Theme.page.text,
  },
};

export const ChainOfThoughtPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const {
    chainOfThoughts,
    updateChainOfThoughtDefinition,
    addChainOfThought,
    removeChainOfThought,
    updateStep,
    addStep,
    removeStep,
  } = useChainOfThoughtCache(chatId!);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cotToDelete, setCotToDelete] = useState<string | null>(null);
  const { isGenerating } = useChainOfThoughtGenerationStatus(chatId!);

  const chainOfThoughtService = d.ChainOfThoughtService(chatId!);

  const handleAddChainOfThought = () =>
    addChainOfThought?.(createNewChainOfThought());

  const handleCotChange = (
    id: string,
    field: keyof ChainOfThought,
    value: string | ChainOfThoughtStep[],
  ) => {
    updateChainOfThoughtDefinition?.(id, field, value);
  };

  const handleStepChange = (
    cotId: string,
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => {
    updateStep?.(cotId, stepId, field, value);
  };

  const handleAddStep = (cotId: string) => {
    const newStep: ChainOfThoughtStep = {
      id: uuidv4(),
      prompt: "",
      enabled: true,
      includePlanningMessages: false,
      consolidateMessageHistory: false,
    };
    addStep?.(cotId, newStep);
  };

  const handleRemoveStep = (cotId: string, stepId: string) => {
    removeStep?.(cotId, stepId);
  };

  const handleExecute = (id: string) => {
    d.ChainOfThoughtGenerationService(chatId!).executeChainOfThought(id);
  };

  const handleRemoveCot = (id: string) => {
    setCotToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmRemoveCot = () => {
    if (cotToDelete) {
      removeChainOfThought?.(cotToDelete);
    }

    setIsConfirmModalOpen(false);
    setCotToDelete(null);
  };

  const handleGoBack = async () => {
    chainOfThoughtService?.savePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={30}>
        <ChainOfThoughtHeader onGoBack={handleGoBack} />

        <Stack>
          <ChainOfThoughtList
            chainOfThoughts={chainOfThoughts}
            onAdd={handleAddChainOfThought}
            onChange={handleCotChange}
            onStepChange={handleStepChange}
            onAddStep={handleAddStep}
            onRemoveStep={handleRemoveStep}
            onExecute={handleExecute}
            onRemove={handleRemoveCot}
            isGenerating={isGenerating}
          />
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmRemoveCot}
        title="Confirm Deletion"
        message="Are you sure you want to delete this chain of thought?"
      />
    </Page>
  );
};

interface ChainOfThoughtHeaderProps {
  onGoBack: () => void;
}

const ChainOfThoughtHeader: React.FC<ChainOfThoughtHeaderProps> = ({
  onGoBack,
}) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiBrainLine size={24} color={Theme.chainOfThought.primary} />
        <Title order={2} fw={400} style={{ color: Theme.chainOfThought.primary }}>
          Chain of Thought
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.chainOfThought.border }} />
  </>
);

interface ChainOfThoughtListProps {
  chainOfThoughts: ChainOfThought[];
  onAdd: () => void;
  onChange: (
    id: string,
    field: keyof ChainOfThought,
    value: string | ChainOfThoughtStep[],
  ) => void;
  onStepChange: (
    cotId: string,
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => void;
  onAddStep: (cotId: string) => void;
  onRemoveStep: (cotId: string, stepId: string) => void;
  onExecute: (id: string) => void;
  onRemove: (id: string) => void;
  isGenerating: (cotId: string) => boolean;
}

const ChainOfThoughtList: React.FC<ChainOfThoughtListProps> = ({
  chainOfThoughts,
  onAdd,
  onChange,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onExecute,
  onRemove,
  isGenerating,
}) => (
  <Stack>
    <Group justify="space-between">
      <Text fw={500}>Chain of Thought Templates</Text>
      <Button
        variant="subtle"
        onClick={onAdd}
        style={{ color: Theme.chainOfThought.primary }}
      >
        <RiAddLine /> Add Template
      </Button>
    </Group>
    {chainOfThoughts.map((cot) => (
      <ChainOfThoughtEditor
        key={cot.id}
        cot={cot}
        onChange={onChange}
        onStepChange={onStepChange}
        onAddStep={onAddStep}
        onRemoveStep={onRemoveStep}
        onExecute={onExecute}
        onRemove={onRemove}
        isGenerating={isGenerating(cot.id)}
      />
    ))}
  </Stack>
);

interface ChainOfThoughtEditorProps {
  cot: ChainOfThought;
  onChange: (
    id: string,
    field: keyof ChainOfThought,
    value: string | ChainOfThoughtStep[],
  ) => void;
  onStepChange: (
    cotId: string,
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => void;
  onAddStep: (cotId: string) => void;
  onRemoveStep: (cotId: string, stepId: string) => void;
  onExecute: (id: string) => void;
  onRemove: (id: string) => void;
  isGenerating: boolean;
}

const ChainOfThoughtEditor: React.FC<ChainOfThoughtEditorProps> = ({
  cot,
  onChange,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onExecute,
  onRemove,
  isGenerating,
}) => (
  <Stack key={cot.id} gap="sm">
    <TextInput
      label="Template Name"
      value={cot.name}
      onChange={(e) => onChange(cot.id, "name", e.currentTarget.value)}
      styles={inputStyles}
    />

    <Text size="sm" fw={500} style={{ color: Theme.page.text }}>
      Reasoning Steps
    </Text>

    {cot.steps.map((step, index) => (
      <StepEditor
        key={step.id}
        cotId={cot.id}
        step={step}
        stepNumber={index + 1}
        onStepChange={onStepChange}
        onRemove={() => onRemoveStep(cot.id, step.id)}
      />
    ))}

    <Button
      variant="light"
      onClick={() => onAddStep(cot.id)}
      style={{ color: Theme.chainOfThought.primary }}
    >
      <RiAddLine /> Add Step
    </Button>

    <Group gap="sm">
      <Button
        variant="light"
        color="blue"
        onClick={() => onExecute(cot.id)}
        loading={isGenerating}
        leftSection={<RiPlayLine />}
      >
        Execute Chain of Thought
      </Button>
      <Button variant="outline" color="red" onClick={() => onRemove(cot.id)}>
        <RiDeleteBinLine /> Delete Template
      </Button>
    </Group>
    <Divider my="sm" style={{ borderColor: Theme.chainOfThought.border }} />
  </Stack>
);

interface StepEditorProps {
  cotId: string;
  step: ChainOfThoughtStep;
  stepNumber: number;
  onStepChange: (
    cotId: string,
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => void;
  onRemove: () => void;
}

const StepEditor: React.FC<StepEditorProps> = ({
  cotId,
  step,
  stepNumber,
  onStepChange,
  onRemove,
}) => (
  <Paper
    p="md"
    style={{
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderLeft: `3px solid ${Theme.chainOfThought.primary}`,
    }}
  >
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} style={{ color: Theme.chainOfThought.primary }}>
          Step {stepNumber}
        </Text>
        <ActionIcon onClick={onRemove} variant="subtle" color="red">
          <RiDeleteBinLine />
        </ActionIcon>
      </Group>

      <Textarea
        label="Prompt"
        value={step.prompt}
        onChange={(e) =>
          onStepChange(cotId, step.id, "prompt", e.currentTarget.value)
        }
        minRows={3}
        autosize
        styles={inputStyles}
      />

      <ModelSelect
        value={step.model || ""}
        onChange={(value) =>
          onStepChange(cotId, step.id, "model", value || "")
        }
        label="Model (optional)"
        withDescription={false}
      />

      <Checkbox
        label="Enabled"
        checked={step.enabled}
        onChange={(e) =>
          onStepChange(cotId, step.id, "enabled", e.currentTarget.checked)
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />

      <Checkbox
        label="Include Planning Messages"
        checked={step.includePlanningMessages}
        onChange={(e) =>
          onStepChange(
            cotId,
            step.id,
            "includePlanningMessages",
            e.currentTarget.checked,
          )
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />

      <Checkbox
        label="Consolidate Message History"
        checked={step.consolidateMessageHistory}
        onChange={(e) =>
          onStepChange(
            cotId,
            step.id,
            "consolidateMessageHistory",
            e.currentTarget.checked,
          )
        }
        styles={{
          label: { color: Theme.page.text },
        }}
      />
    </Stack>
  </Paper>
);
