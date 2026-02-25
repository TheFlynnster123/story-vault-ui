import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Stack, Select, Textarea, Button, Group, Text } from "@mantine/core";
import { RiCheckLine, RiArrowLeftLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";
import { useSystemPrompts } from "../../../Prompts/hooks/useSystemPrompts";
import { EditPromptButton } from "../../../AI/components/EditPromptButton";

interface PromptStepProps {
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PromptStep: React.FC<PromptStepProps> = ({
  state,
  updateState,
  onNext,
  onBack,
}) => {
  const navigate = useNavigate();
  const { systemPrompts, isLoading } = useSystemPrompts();

  const defaultPrompt = useMemo(() => {
    if (state.promptType === "Third Person") {
      return systemPrompts.defaultThirdPersonPrompt || "";
    } else if (state.promptType === "First Person") {
      return systemPrompts.defaultFirstPersonPrompt || "";
    }
    return "";
  }, [
    state.promptType,
    systemPrompts.defaultThirdPersonPrompt,
    systemPrompts.defaultFirstPersonPrompt,
  ]);

  const handlePromptTypeChange = (value: string | null) => {
    if (!value) return;

    const promptType = value as "Manual" | "First Person" | "Third Person";
    updateState({ promptType });

    // Pre-fill the prompt based on the selected type
    if (promptType === "First Person") {
      updateState({
        prompt: systemPrompts.defaultFirstPersonPrompt || "",
      });
    } else if (promptType === "Third Person") {
      updateState({
        prompt: systemPrompts.defaultThirdPersonPrompt || "",
      });
    } else if (promptType === "Manual") {
      updateState({ prompt: "" });
    }
  };

  const handleEditPrompt = () => {
    if (state.promptType === "Third Person") {
      navigate("/system-prompts#defaultThirdPersonPrompt");
    } else if (state.promptType === "First Person") {
      navigate("/system-prompts#defaultFirstPersonPrompt");
    }
  };

  const canEditPrompt =
    state.promptType === "Third Person" || state.promptType === "First Person";

  return (
    <Stack>
      <Select
        label="Prompt Type"
        placeholder="Select prompt type..."
        data={["Third Person", "First Person", "Manual"]}
        value={state.promptType || "Third Person"}
        onChange={handlePromptTypeChange}
        withAsterisk
      />

      {!isLoading && (
        <Stack gap="xs">
          <Textarea
            label="Prompt"
            placeholder="Enter your prompt..."
            minRows={6}
            value={state.prompt || defaultPrompt}
            onChange={(e) => updateState({ prompt: e.currentTarget.value })}
            styles={{ input: { height: "50vh" } }}
          />
          <Group justify="space-between" align="center">
            <EditPromptButton
              onClick={handleEditPrompt}
              disabled={!canEditPrompt}
            />
            <Text size="xs" c="dimmed">
              {canEditPrompt
                ? "Edit the default prompt in System Prompts"
                : "Select a prompt type to edit defaults"}
            </Text>
          </Group>
        </Stack>
      )}

      <Group justify="space-between" mt="xl">
        <Button
          leftSection={<RiArrowLeftLine size={18} />}
          onClick={onBack}
          variant="default"
        >
          Back
        </Button>
        <Button rightSection={<RiCheckLine size={18} />} onClick={onNext}>
          Next
        </Button>
      </Group>
    </Stack>
  );
};
