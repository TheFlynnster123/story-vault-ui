import React, { useMemo, useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import type { ComboboxData } from "@mantine/core";
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiSave3Line,
} from "react-icons/ri";
import { EditPromptButton } from "../../../AI/components/EditPromptButton";
import {
  getPresetByName,
  useChatPromptPresets,
} from "../../../Prompts/hooks/useChatPromptPresets";
import type { ChatPromptPreset } from "../../../Prompts/services/ChatPromptPresets";

const PROMPT_DESCRIPTION =
  "This is the system prompt that guides how the AI responds to your messages. You can use it to change the perspective the bot responds from, such as 'you' or 'I'.";

const normalizePresetName = (name: string) => name.trim().toLowerCase();

const getPromptPreview = (prompt: string): string => {
  const collapsedPrompt = prompt.replace(/\s+/g, " ").trim();

  if (!collapsedPrompt) {
    return "No prompt preview available.";
  }

  if (collapsedPrompt.length <= 160) {
    return collapsedPrompt;
  }

  return `${collapsedPrompt.slice(0, 157)}...`;
};

interface BuiltInPromptSelectionOption {
  value: string;
  label: string;
}

interface ChatPromptEditorProps {
  builtInOptions?: BuiltInPromptSelectionOption[];
  selectionValue: string | null;
  onSelectionChange: (value: string | null, preset?: ChatPromptPreset) => void;
  promptValue: string;
  onPromptChange: (value: string) => void;
  promptReadOnly?: boolean;
  isLoading?: boolean;
  selectionClearable?: boolean;
  selectionRequired?: boolean;
  selectionPlaceholder?: string;
  emphasizeSelectionArea?: boolean;
  promptMinRows?: number;
  promptHeight?: string;
  canEditDefaultPrompt?: boolean;
  onEditDefaultPrompt?: () => void;
  editDefaultPromptMessage?: string;
  onPresetSaved?: (preset: ChatPromptPreset) => void;
  onPresetDeleted?: (presetId: string) => void;
}

export const ChatPromptEditor: React.FC<ChatPromptEditorProps> = ({
  builtInOptions = [],
  selectionValue,
  onSelectionChange,
  promptValue,
  onPromptChange,
  promptReadOnly = false,
  isLoading = false,
  selectionClearable = false,
  selectionRequired = false,
  selectionPlaceholder = "Select a prompt...",
  emphasizeSelectionArea = false,
  promptMinRows = 6,
  promptHeight = "30vh",
  canEditDefaultPrompt = false,
  onEditDefaultPrompt,
  editDefaultPromptMessage,
  onPresetSaved,
  onPresetDeleted,
}) => {
  const {
    presets,
    isLoading: isLoadingPresets,
    savePreset,
    deletePreset,
  } = useChatPromptPresets();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [selectedOverwritePresetId, setSelectedOverwritePresetId] = useState<
    string | null
  >(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectionValue),
    [presets, selectionValue],
  );

  const selectedPromptLabel = useMemo(() => {
    if (selectedPreset) {
      return selectedPreset.name;
    }

    return builtInOptions.find((option) => option.value === selectionValue)
      ?.label;
  }, [builtInOptions, selectedPreset, selectionValue]);

  const selectData = useMemo<ComboboxData>(() => {
    const optionData = builtInOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
    const presetData = presets.map((preset) => ({
      value: preset.id,
      label: preset.name,
    }));

    if (presetData.length === 0) {
      return optionData;
    }

    return [...optionData, { group: "Presets", items: presetData }];
  }, [builtInOptions, presets]);

  const overwriteTargetPreset = useMemo(() => {
    if (!selectedOverwritePresetId) {
      return undefined;
    }

    return presets.find((preset) => preset.id === selectedOverwritePresetId);
  }, [presets, selectedOverwritePresetId]);

  const isPromptLoading = isLoading || isLoadingPresets;

  const handleSelectionChange = (value: string | null) => {
    if (!value) {
      onSelectionChange(null);
      return;
    }

    const preset = presets.find((item) => item.id === value);
    onSelectionChange(value, preset);
  };

  const openSaveModal = () => {
    setSavePresetName("");
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

  const handleOverwritePresetSelect = (preset: ChatPromptPreset) => {
    setSelectedOverwritePresetId(preset.id);
    setSavePresetName(preset.name);
  };

  const getOverwriteCandidate = (): ChatPromptPreset | undefined => {
    if (overwriteTargetPreset) {
      return overwriteTargetPreset;
    }

    return getPresetByName(presets, savePresetName);
  };

  const closeSaveFlows = () => {
    setOverwriteConfirmOpen(false);
    setSaveModalOpen(false);
    setSavePresetName("");
    setSelectedOverwritePresetId(null);
  };

  const handleSaveSubmit = async () => {
    const overwriteCandidate = getOverwriteCandidate();

    if (overwriteCandidate) {
      setOverwriteConfirmOpen(true);
      return;
    }

    const savedPreset = await savePreset({
      name: savePresetName,
      prompt: promptValue,
    });

    onPresetSaved?.(savedPreset);
    closeSaveFlows();
  };

  const confirmOverwrite = async () => {
    const overwriteCandidate = getOverwriteCandidate();

    if (!overwriteCandidate) {
      setOverwriteConfirmOpen(false);
      return;
    }

    const savedPreset = await savePreset({
      id: overwriteCandidate.id,
      name: savePresetName,
      prompt: promptValue,
    });

    onPresetSaved?.(savedPreset);
    closeSaveFlows();
  };

  const confirmDelete = async () => {
    if (!selectedPreset) {
      setDeleteConfirmOpen(false);
      return;
    }

    await deletePreset(selectedPreset.id);
    onPresetDeleted?.(selectedPreset.id);
    setDeleteConfirmOpen(false);
  };

  const canSubmitSave =
    savePresetName.trim().length > 0 || selectedOverwritePresetId !== null;
  const overwriteCandidate = getOverwriteCandidate();
  const selectionControls = (
    <Group align="flex-end" wrap="wrap">
      <Select
        label="Prompt Selection"
        placeholder={selectionPlaceholder}
        data={selectData}
        value={selectionValue}
        onChange={handleSelectionChange}
        withAsterisk={selectionRequired}
        clearable={selectionClearable}
        style={{ flex: 1, minWidth: 260 }}
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
        disabled={!selectedPreset}
        onClick={() => setDeleteConfirmOpen(true)}
      >
        Delete
      </Button>
    </Group>
  );

  return (
    <Stack gap="xs">
      <Modal
        opened={saveModalOpen}
        onClose={() => closeSaveFlows()}
        title="Save prompt"
      >
        <Stack>
          <TextInput
            label="Prompt name"
            placeholder="e.g. Cinematic third-person"
            value={savePresetName}
            onChange={(e) => handleSavePresetNameChange(e.currentTarget.value)}
            autoFocus
          />

          {presets.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Or overwrite an existing prompt
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
              No saved prompts yet.
            </Text>
          )}

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={() => closeSaveFlows()}
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

      <Modal
        opened={overwriteConfirmOpen}
        onClose={() => setOverwriteConfirmOpen(false)}
        title="Overwrite prompt?"
      >
        <Stack>
          <Text size="sm">
            Overwrite "{overwriteCandidate?.name || savePresetName.trim()}" with
            the current prompt?
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

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete prompt?"
      >
        <Stack>
          <Text size="sm">
            This will permanently delete "{selectedPromptLabel || "this prompt"}
            ".
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<RiCloseLine size={16} />}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              leftSection={<RiDeleteBinLine size={16} />}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {emphasizeSelectionArea ? (
        <>
          <Divider my="xs" />
          <Paper withBorder radius="md" p="md">
            {selectionControls}
          </Paper>
        </>
      ) : (
        selectionControls
      )}

      {!isPromptLoading && (
        <>
          <Textarea
            label="Prompt"
            description={PROMPT_DESCRIPTION}
            placeholder="Enter your prompt..."
            minRows={promptMinRows}
            value={promptValue}
            readOnly={promptReadOnly}
            onChange={(e) => onPromptChange(e.currentTarget.value)}
            styles={{
              input: {
                height: promptHeight,
                cursor: promptReadOnly ? "default" : undefined,
              },
            }}
          />

          {(onEditDefaultPrompt || editDefaultPromptMessage) && (
            <Group justify="space-between" align="center">
              <EditPromptButton
                onClick={onEditDefaultPrompt}
                disabled={!canEditDefaultPrompt}
              />
              {editDefaultPromptMessage && (
                <Text size="xs" c="dimmed">
                  {editDefaultPromptMessage}
                </Text>
              )}
            </Group>
          )}
        </>
      )}
    </Stack>
  );
};
