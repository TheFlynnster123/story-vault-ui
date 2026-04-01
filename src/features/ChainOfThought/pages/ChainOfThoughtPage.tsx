import React from "react";
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
import type { ChainOfThoughtStep } from "../services/ChainOfThought";
import { useChainOfThoughtCache } from "../hooks/useChainOfThoughtCache";
import { useChainOfThoughtGenerationStatus } from "../hooks/useChainOfThoughtGenerationStatus";
import { v4 as uuidv4 } from "uuid";
import { Theme } from "../../../components/Theme";
import { Page } from "../../../components/Page";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../AI/components/ModelSelect";

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
    chainOfThought,
    updateChainOfThoughtDefinition,
    updateStep,
    addStep,
    removeStep,
  } = useChainOfThoughtCache(chatId!);
  const { isGenerating } = useChainOfThoughtGenerationStatus(chatId!);

  const chainOfThoughtService = d.ChainOfThoughtService(chatId!);

  const handleCotChange = (
    field: keyof Pick<import("../services/ChainOfThought").ChainOfThought, "name" | "steps">,
    value: string | ChainOfThoughtStep[],
  ) => {
    updateChainOfThoughtDefinition?.(field, value);
  };

  const handleStepChange = (
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => {
    updateStep?.(stepId, field, value);
  };

  const handleAddStep = () => {
    const newStep: ChainOfThoughtStep = {
      id: uuidv4(),
      prompt: "",
      enabled: true,
      includePlanningMessages: false,
      consolidateMessageHistory: false,
    };
    addStep?.(newStep);
  };

  const handleRemoveStep = (stepId: string) => {
    removeStep?.(stepId);
  };

  const handleExecute = () => {
    d.ChainOfThoughtGenerationService(chatId!).executeChainOfThought();
  };

  const handleGoBack = async () => {
    chainOfThoughtService?.savePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  if (!chainOfThought) {
    return <Page><Text>Loading...</Text></Page>;
  }

  return (
    <Page>
      <Paper mt={30}>
        <Group justify="space-between" align="center" mb="md">
          <Group>
            <ActionIcon onClick={handleGoBack} variant="subtle" size="lg">
              <RiArrowLeftLine color={Theme.page.text} />
            </ActionIcon>
            <RiBrainLine size={24} color={Theme.chainOfThought.primary} />
            <Title order={2} fw={400} style={{ color: Theme.chainOfThought.primary }}>
              Chain of Thought
            </Title>
          </Group>
        </Group>
        <Divider mb="xl" style={{ borderColor: Theme.chainOfThought.border }} />

        <Stack gap="md">
          <TextInput
            label="Name"
            value={chainOfThought.name}
            onChange={(e) => handleCotChange("name", e.currentTarget.value)}
            styles={inputStyles}
          />

          <Text size="sm" fw={500} style={{ color: Theme.page.text }}>
            Reasoning Steps
          </Text>

          {chainOfThought.steps.map((step, index) => (
            <StepEditor
              key={step.id}
              step={step}
              stepNumber={index + 1}
              onStepChange={handleStepChange}
              onRemove={() => handleRemoveStep(step.id)}
            />
          ))}

          <Button
            variant="light"
            onClick={handleAddStep}
            style={{ color: Theme.chainOfThought.primary }}
          >
            <RiAddLine /> Add Step
          </Button>

          <Group gap="sm">
            <Button
              variant="light"
              color="blue"
              onClick={handleExecute}
              loading={isGenerating}
              leftSection={<RiPlayLine />}
            >
              Execute Chain of Thought
            </Button>
          </Group>

          {chainOfThought.lastExecution && (
            <>
              <Divider my="md" style={{ borderColor: Theme.chainOfThought.border }} />
              <Text size="sm" fw={500} style={{ color: Theme.page.text }}>
                Last Execution Results
              </Text>
              <Text size="xs" c="dimmed">
                Executed: {new Date(chainOfThought.lastExecution.executedAt).toLocaleString()}
              </Text>
              {chainOfThought.lastExecution.stepResults.map((result, idx) => (
                <Paper
                  key={idx}
                  p="md"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderLeft: `3px solid ${Theme.chainOfThought.primary}`,
                  }}
                >
                  <Text fw={600} mb="xs" style={{ color: Theme.chainOfThought.primary }}>
                    Step {result.stepIndex + 1} Output
                  </Text>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {result.content}
                  </Text>
                </Paper>
              ))}
            </>
          )}
        </Stack>
      </Paper>
    </Page>
  );
};

interface StepEditorProps {
  step: ChainOfThoughtStep;
  stepNumber: number;
  onStepChange: (
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ) => void;
  onRemove: () => void;
}

const StepEditor: React.FC<StepEditorProps> = ({
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
          onStepChange(step.id, "prompt", e.currentTarget.value)
        }
        minRows={3}
        autosize
        styles={inputStyles}
      />

      <ModelSelect
        value={step.model || ""}
        onChange={(value) =>
          onStepChange(step.id, "model", value || "")
        }
        label="Model (optional)"
        withDescription={false}
      />

      <Checkbox
        label="Enabled"
        checked={step.enabled}
        onChange={(e) =>
          onStepChange(step.id, "enabled", e.currentTarget.checked)
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
