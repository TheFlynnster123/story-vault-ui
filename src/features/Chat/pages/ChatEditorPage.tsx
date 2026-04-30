import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiChatSettingsLine } from "react-icons/ri";
import {
  Title,
  TextInput,
  Textarea,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Divider,
  Button,
  Modal,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { ChatSettings } from "../services/Chat/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { ChatDeleteControl } from "../components/ChatEditor/ChatDeleteControl";
import { BackgroundPhotoUploader } from "../components/ChatEditor/BackgroundPhotoUploader";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { useChatSettings } from "../hooks/useChatSettings";
import { d } from "../../../services/Dependencies";
import {
  getPresetByName,
  useChatPromptPresets,
} from "../../Prompts/hooks/useChatPromptPresets";

export const ChatEditorPage: React.FC = () => {
  const { id: chatIdFromParams } = useParams();
  const {
    chatId,
    form,
    handlePhotoUpload,
    removePhoto,
    handleCivitJobIdChange,
    onFormUpdated,
    handleGoBack,
    presets,
    savePresetOpen,
    setSavePresetOpen,
    presetName,
    setPresetName,
    overwriteConfirmOpen,
    setOverwriteConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    openSavePreset,
    submitSavePreset,
    confirmOverwrite,
    confirmDelete,
    requestDeletePreset,
  } = useChatEditor(chatIdFromParams);

  return (
    <Page>
      <Paper mt={20}>
        <ChatEditorHeader onGoBack={handleGoBack} />

        <Stack>
          <Modal
            opened={savePresetOpen}
            onClose={() => setSavePresetOpen(false)}
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
                <Button
                  variant="default"
                  onClick={() => setSavePresetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitSavePreset}
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
                A preset named "{presetName.trim()}" already exists. Overwrite
                it?
              </Text>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => setOverwriteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="red" onClick={confirmOverwrite}>
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
                <Button
                  variant="default"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="red" onClick={confirmDelete}>
                  Delete
                </Button>
              </Group>
            </Stack>
          </Modal>

          <ChatFormFields
            form={form}
            onFormUpdated={onFormUpdated}
            presets={presets}
            onSavePresetAs={openSavePreset}
            onRequestDeletePreset={requestDeletePreset}
          />

          <BackgroundPhotoUploader
            chatId={chatId}
            backgroundPhotoBase64={form.values.backgroundPhotoBase64}
            backgroundPhotoCivitJobId={form.values.backgroundPhotoCivitJobId}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
            onCivitJobIdChange={handleCivitJobIdChange}
          />
        </Stack>

        <ChatEditorFooter chatId={chatId} />
      </Paper>
    </Page>
  );
};

interface ChatEditorHeaderProps {
  onGoBack: () => void;
}

const ChatEditorHeader: React.FC<ChatEditorHeaderProps> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiChatSettingsLine size={24} color={Theme.chatSettings.primary} />
        <Title order={2} fw={400} style={{ color: Theme.chatSettings.primary }}>
          Edit Chat
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.chatSettings.border }} />
  </>
);

const useChatEditor = (chatIdFromParams: string | undefined) => {
  const [chatId] = useState(chatIdFromParams ?? uuidv4());
  const navigate = useNavigate();
  const { chatSettings } = useChatSettings(chatId);
  const { presets, savePreset, deletePreset } = useChatPromptPresets();

  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  const form = useForm<ChatSettings>({
    initialValues: {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "",
      backgroundPhotoBase64: undefined as string | undefined,
      backgroundPhotoCivitJobId: undefined as string | undefined,
      prompt: "",
    },
    validate: {
      chatTitle: (value: string) =>
        value.trim().length > 0 ? null : "Story title is required",
    },
  });

  useEffect(() => {
    if (chatSettings) {
      const values = {
        timestampCreatedUtcMs: Date.now(),
        chatTitle: chatSettings.chatTitle || "",
        backgroundPhotoBase64: chatSettings.backgroundPhotoBase64,
        backgroundPhotoCivitJobId: chatSettings.backgroundPhotoCivitJobId,
        prompt: chatSettings.prompt || "",
      };
      form.setInitialValues(values);
      form.reset();
    }
  }, [chatSettings]);

  const onFormUpdated = (overrides?: Partial<ChatSettings>) => {
    const settingsToSave: ChatSettings = {
      ...form.values,
      ...overrides,
      chatTitle: (overrides?.chatTitle ?? form.values.chatTitle).trim(),
    };

    d.ChatSettingsService(chatId).saveDebounced(settingsToSave);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        form.setFieldValue("backgroundPhotoBase64", base64String);
        // Clear CivitJob when uploading a new photo
        form.setFieldValue("backgroundPhotoCivitJobId", undefined);
        onFormUpdated({
          backgroundPhotoBase64: base64String,
          backgroundPhotoCivitJobId: undefined,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    form.setFieldValue("backgroundPhotoBase64", undefined);
    form.setFieldValue("backgroundPhotoCivitJobId", undefined);
    onFormUpdated({
      backgroundPhotoBase64: undefined,
      backgroundPhotoCivitJobId: undefined,
    });
  };

  const handleCivitJobIdChange = (jobId: string | undefined) => {
    form.setFieldValue("backgroundPhotoCivitJobId", jobId);
    // Clear uploaded photo when setting CivitJob
    if (jobId) {
      form.setFieldValue("backgroundPhotoBase64", undefined);
    }
    onFormUpdated({
      backgroundPhotoCivitJobId: jobId,
      backgroundPhotoBase64: jobId
        ? undefined
        : form.values.backgroundPhotoBase64,
    });
  };

  const handleGoBack = async () => {
    d.ChatSettingsService(chatId).savePendingChanges();
    navigate(-1);
  };

  const openSavePreset = () => {
    setPresetName("");
    setSavePresetOpen(true);
  };

  const submitSavePreset = async () => {
    const existing = getPresetByName(presets, presetName);
    if (existing) {
      setOverwriteConfirmOpen(true);
      return;
    }

    await savePreset({ name: presetName, prompt: form.values.prompt });
    setSavePresetOpen(false);
  };

  const confirmOverwrite = async () => {
    const existing = getPresetByName(presets, presetName);
    if (!existing) {
      setOverwriteConfirmOpen(false);
      return;
    }
    await savePreset({
      id: existing.id,
      name: presetName,
      prompt: form.values.prompt,
    });
    setOverwriteConfirmOpen(false);
    setSavePresetOpen(false);
  };

  const requestDeletePreset = (presetId: string) => {
    setPresetToDelete(presetId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!presetToDelete) return;
    await deletePreset(presetToDelete);
    setDeleteConfirmOpen(false);
    setPresetToDelete(null);
  };

  const handleDeleteSuccess = () => {
    navigate("/chat");
  };

  return {
    chatId,
    form,
    handlePhotoUpload,
    removePhoto,
    handleCivitJobIdChange,
    onFormUpdated,
    handleGoBack,
    handleDeleteSuccess,
    presets,
    savePresetOpen,
    setSavePresetOpen,
    presetName,
    setPresetName,
    overwriteConfirmOpen,
    setOverwriteConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    openSavePreset,
    submitSavePreset,
    confirmOverwrite,
    requestDeletePreset,
    confirmDelete,
  };
};

interface ChatFormFieldsProps {
  form: {
    getInputProps: (field: string) => any;
  };
  onFormUpdated: (overrides?: Partial<ChatSettings>) => void;
  presets: { id: string; name: string }[];
  onSavePresetAs: () => void;
  onRequestDeletePreset: (presetId: string) => void;
}

const ChatFormFields: React.FC<ChatFormFieldsProps> = ({
  form,
  onFormUpdated,
  presets,
  onSavePresetAs,
  onRequestDeletePreset,
}) => (
  <Stack>
    <TextInput
      label="Story Title"
      placeholder="Enter a title for your story..."
      withAsterisk
      autoFocus
      {...form.getInputProps("chatTitle")}
      onChange={(e) => {
        form.getInputProps("chatTitle").onChange(e);
        onFormUpdated({ chatTitle: e.currentTarget.value });
      }}
    />

    <Textarea
      label="Prompt"
      placeholder="Enter your prompt..."
      minRows={6}
      {...form.getInputProps("prompt")}
      onChange={(e) => {
        form.getInputProps("prompt").onChange(e);
        onFormUpdated({ prompt: e.currentTarget.value });
      }}
      styles={{ input: { height: "30vh" } }}
    />

    <Group justify="space-between" align="center">
      <Button variant="default" onClick={onSavePresetAs}>
        Save preset as
      </Button>

      <Button
        variant="default"
        color="red"
        disabled={presets.length === 0}
        onClick={() => {
          // For editor we delete by selecting from most recent
          onRequestDeletePreset(presets[0].id);
        }}
      >
        Delete preset
      </Button>
    </Group>
  </Stack>
);

interface ChatEditorFooterProps {
  chatId: string;
}

const ChatEditorFooter: React.FC<ChatEditorFooterProps> = ({ chatId }) => (
  <Group justify="center" mt="xl">
    <ChatDeleteControl chatId={chatId} />
  </Group>
);
