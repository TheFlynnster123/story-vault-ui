import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stack,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
} from "@mantine/core";
import { RiCheckLine, RiArrowLeftLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";
import { useSystemPrompts } from "../../../Prompts/hooks/useSystemPrompts";
import { EditPromptButton } from "../../../AI/components/EditPromptButton";
import {
  getPresetByName,
  useChatPromptPresets,
} from "../../../Prompts/hooks/useChatPromptPresets";

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
  const { presets, isLoading: isLoadingPresets, savePreset, deletePreset } =
    useChatPromptPresets();

  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPresetIdForDelete, setSelectedPresetIdForDelete] =
    useState<string | null>(null);

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

    if (value === "First Person" || value === "Third Person" || value === "Manual") {
      const promptType = value as "Manual" | "First Person" | "Third Person";
      updateState({ promptType, selectedPromptPresetId: undefined });

      if (promptType === "First Person") {
        updateState({ prompt: systemPrompts.defaultFirstPersonPrompt || "" });
      } else if (promptType === "Third Person") {
        updateState({ prompt: systemPrompts.defaultThirdPersonPrompt || "" });
      } else {
        updateState({ prompt: "" });
      }
      return;
    }

    // Custom preset selected
    const preset = presets.find((p) => p.id === value);
    if (!preset) return;
    updateState({
      promptType: "Preset",
      prompt: preset.prompt,
      selectedPromptPresetId: preset.id,
    });
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

  const promptTypeValue = useMemo(() => {
    if (state.promptType === "Preset" && state.selectedPromptPresetId) {
      return state.selectedPromptPresetId;
    }
    return state.promptType || "Third Person";
  }, [state.promptType, state.selectedPromptPresetId]);

  const selectData = useMemo(() => {
    const base = ["Third Person", "First Person", "Manual"];
    const presetOptions = presets.map((p) => ({ value: p.id, label: p.name }));
    if (presetOptions.length === 0) return base;
    return [
      ...base,
      { group: "Presets", items: presetOptions },
    ];
  }, [presets]);

  const onOpenSavePreset = () => {
    setPresetName("");
    setSavePresetModalOpen(true);
  };

  const onSubmitSavePreset = async () => {
    const existing = getPresetByName(presets, presetName);
    if (existing) {
      setOverwriteConfirmOpen(true);
      return;
    }

    const saved = await savePreset({
      name: presetName,
      prompt: state.prompt || defaultPrompt,
    });
    updateState({
      promptType: "Preset",
      selectedPromptPresetId: saved.id,
      prompt: saved.prompt,
    });
    setSavePresetModalOpen(false);
  };

  const onConfirmOverwrite = async () => {
    const existing = getPresetByName(presets, presetName);
    if (!existing) {
      setOverwriteConfirmOpen(false);
      return;
    }

    const saved = await savePreset({
      id: existing.id,
      name: presetName,
      prompt: state.prompt || defaultPrompt,
    });
    updateState({
      promptType: "Preset",
      selectedPromptPresetId: saved.id,
      prompt: saved.prompt,
    });
    setOverwriteConfirmOpen(false);
    setSavePresetModalOpen(false);
  };

  const onRequestDeletePreset = () => {
    if (state.promptType !== "Preset" || !state.selectedPromptPresetId) return;
    setSelectedPresetIdForDelete(state.selectedPromptPresetId);
    setDeleteConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!selectedPresetIdForDelete) return;
    await deletePreset(selectedPresetIdForDelete);
    if (state.selectedPromptPresetId === selectedPresetIdForDelete) {
      updateState({
        promptType: "Third Person",
        selectedPromptPresetId: undefined,
        prompt: systemPrompts.defaultThirdPersonPrompt || "",
      });
    }
    setDeleteConfirmOpen(false);
    setSelectedPresetIdForDelete(null);
  };

  return (
    <Stack>
      <Modal
        opened={savePresetModalOpen}
        onClose={() => setSavePresetModalOpen(false)}
        title="Save preset as"
      >
        <Stack>
          <TextInput
            label="Preset name"
            placeholder="e.g. Cinematic third-person"
            value={presetName}
            onChange={(e) => setPresetName(e.currentTarget.value)}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSavePresetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmitSavePreset}
              disabled={presetName.trim().length === 0}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={overwriteConfirmOpen}
        onClose={() => setOverwriteConfirmOpen(false)}
        title="Overwrite preset?"
      >
        <Stack>
          <Text size="sm">
            A preset named "{presetName.trim()}" already exists. Overwrite it?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOverwriteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={onConfirmOverwrite}>
              Overwrite
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete preset?"
      >
        <Stack>
          <Text size="sm">This will permanently delete the preset.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={onConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Select
        label="Prompt Type"
        placeholder="Select prompt type..."
        data={selectData as any}
        value={promptTypeValue}
        onChange={handlePromptTypeChange}
        withAsterisk
      />

      {!isLoading && !isLoadingPresets && (
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

          <Group justify="space-between" align="center">
            <Button variant="default" onClick={onOpenSavePreset}>
              Save preset as
            </Button>
            <Button
              variant="default"
              color="red"
              disabled={state.promptType !== "Preset"}
              onClick={onRequestDeletePreset}
            >
              Delete preset
            </Button>
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
