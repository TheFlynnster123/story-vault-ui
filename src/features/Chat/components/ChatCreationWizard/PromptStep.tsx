import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Stack, Button, Group } from "@mantine/core";
import { RiCheckLine, RiArrowLeftLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";
import { useSystemPrompts } from "../../../Prompts/hooks/useSystemPrompts";
import { ChatPromptEditor } from "../PromptEditor/ChatPromptEditor";

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
    if (state.promptType === "System Default") {
      return systemPrompts.defaultThirdPersonPrompt || "";
    }
    return "";
  }, [state.promptType, systemPrompts.defaultThirdPersonPrompt]);

  const handlePromptSelectionChange = (value: string | null) => {
    if (!value) return;

    if (value === "System Default" || value === "Manual") {
      const promptType = value as "Manual" | "System Default";

      updateState({
        promptType,
        selectedPromptPresetId: undefined,
        prompt:
          promptType === "System Default"
            ? systemPrompts.defaultThirdPersonPrompt || ""
            : "",
      });

      return;
    }
  };

  const handleEditPrompt = () => {
    if (state.promptType === "System Default") {
      navigate("/system-prompts#defaultThirdPersonPrompt");
    }
  };

  const canEditPrompt = state.promptType === "System Default";

  const promptTypeValue = useMemo(() => {
    if (state.promptType === "Preset" && state.selectedPromptPresetId) {
      return state.selectedPromptPresetId;
    }
    return state.promptType || "System Default";
  }, [state.promptType, state.selectedPromptPresetId]);

  return (
    <Stack>
      <ChatPromptEditor
        builtInOptions={[
          { value: "System Default", label: "System Default" },
          { value: "Manual", label: "Manual" },
        ]}
        selectionValue={promptTypeValue}
        onSelectionChange={(value, preset) => {
          if (preset) {
            updateState({
              promptType: "Preset",
              selectedPromptPresetId: preset.id,
              prompt: preset.prompt,
            });
            return;
          }

          handlePromptSelectionChange(value);
        }}
        promptValue={state.prompt || defaultPrompt}
        onPromptChange={(value) => updateState({ prompt: value })}
        isLoading={isLoading}
        selectionRequired
        selectionPlaceholder="Select a prompt..."
        promptHeight="50vh"
        canEditDefaultPrompt={canEditPrompt}
        onEditDefaultPrompt={handleEditPrompt}
        editDefaultPromptMessage={
          canEditPrompt
            ? "Edit the default prompt in System Prompts"
            : "Choose System Default to edit the default prompt"
        }
        onPresetSaved={(preset) => {
          updateState({
            promptType: "Preset",
            selectedPromptPresetId: preset.id,
            prompt: preset.prompt,
          });
        }}
        onPresetDeleted={(presetId) => {
          if (state.selectedPromptPresetId !== presetId) {
            return;
          }

          updateState({
            promptType: "System Default",
            selectedPromptPresetId: undefined,
            prompt: systemPrompts.defaultThirdPersonPrompt || "",
          });
        }}
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
