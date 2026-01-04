import React from "react";
import { Stack, Select, Textarea, Button, Group } from "@mantine/core";
import { RiCheckLine, RiArrowLeftLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";
import { d } from "../../services/Dependencies";

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
  const handlePromptTypeChange = (value: string | null) => {
    if (!value) return;

    const promptType = value as "Manual" | "First Person" | "Third Person";
    updateState({ promptType });

    // Pre-fill the prompt based on the selected type
    if (promptType === "First Person") {
      const characterName = state.title || undefined;
      updateState({
        prompt: d.DefaultPrompts().FirstPersonChatPrompt(characterName),
      });
    } else if (promptType === "Third Person") {
      updateState({
        prompt: d.DefaultPrompts().ThirdPersonChatPrompt(),
      });
    } else if (promptType === "Manual") {
      updateState({ prompt: "" });
    }
  };

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

      <Textarea
        label="Prompt"
        placeholder="Enter your prompt..."
        minRows={6}
        value={state.prompt || d.DefaultPrompts().ThirdPersonChatPrompt()}
        onChange={(e) => updateState({ prompt: e.currentTarget.value })}
      />

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
