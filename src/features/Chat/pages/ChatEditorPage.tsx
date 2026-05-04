import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiChatSettingsLine } from "react-icons/ri";
import {
  Title,
  TextInput,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { UseFormReturnType } from "@mantine/form";
import type { ChatSettings } from "../services/Chat/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { ChatDeleteControl } from "../components/ChatEditor/ChatDeleteControl";
import { BackgroundPhotoUploader } from "../components/ChatEditor/BackgroundPhotoUploader";
import { ChatPromptEditor } from "../components/PromptEditor/ChatPromptEditor";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { useChatSettings } from "../hooks/useChatSettings";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import { useChatPromptPresets } from "../../Prompts/hooks/useChatPromptPresets";
import { d } from "../../../services/Dependencies";

const SYSTEM_DEFAULT_PROMPT_SELECTION = "System Default";

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
    selectedPresetId,
    handlePromptSelectionChange,
    handlePresetSaved,
    handlePresetDeleted,
  } = useChatEditor(chatIdFromParams);

  return (
    <Page>
      <Paper mt={20}>
        <ChatEditorHeader onGoBack={handleGoBack} />

        <Stack>
          <ChatFormFields
            form={form}
            onFormUpdated={onFormUpdated}
            selectedPresetId={selectedPresetId}
            onPromptSelectionChange={handlePromptSelectionChange}
            onPresetSaved={handlePresetSaved}
            onPresetDeleted={handlePresetDeleted}
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
  const { systemPrompts } = useSystemPrompts();
  const { presets } = useChatPromptPresets();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

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

  const getSelectedPromptId = (prompt: string): string | null => {
    if (prompt === systemPrompts.defaultThirdPersonPrompt) {
      return SYSTEM_DEFAULT_PROMPT_SELECTION;
    }

    return presets.find((preset) => preset.prompt === prompt)?.id || null;
  };

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
      setSelectedPresetId(getSelectedPromptId(chatSettings.prompt || ""));
    }
    // The Mantine form object is not safe to depend on here; including it creates a reset loop.
    // We intentionally resync only when the upstream settings or prompt sources change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSettings, presets, systemPrompts.defaultThirdPersonPrompt]);

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

  const handlePromptSelectionChange = (
    presetId: string | null,
    preset?: { id: string; prompt: string },
  ) => {
    setSelectedPresetId(presetId);

    if (presetId === SYSTEM_DEFAULT_PROMPT_SELECTION) {
      const systemDefaultPrompt = systemPrompts.defaultThirdPersonPrompt || "";
      form.setFieldValue("prompt", systemDefaultPrompt);
      onFormUpdated({ prompt: systemDefaultPrompt });
      return;
    }

    if (!preset) return;

    form.setFieldValue("prompt", preset.prompt);
    onFormUpdated({ prompt: preset.prompt });
  };

  const handlePresetSaved = (preset: { id: string; prompt: string }) => {
    setSelectedPresetId(preset.id);
    form.setFieldValue("prompt", preset.prompt);
    onFormUpdated({ prompt: preset.prompt });
  };

  const handlePresetDeleted = (presetId: string) => {
    if (selectedPresetId === presetId) {
      setSelectedPresetId(null);
    }
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
    selectedPresetId,
    handlePromptSelectionChange,
    handlePresetSaved,
    handlePresetDeleted,
  };
};

interface ChatFormFieldsProps {
  form: UseFormReturnType<ChatSettings>;
  onFormUpdated: (overrides?: Partial<ChatSettings>) => void;
  selectedPresetId: string | null;
  onPromptSelectionChange: (
    presetId: string | null,
    preset?: { id: string; prompt: string },
  ) => void;
  onPresetSaved: (preset: { id: string; prompt: string }) => void;
  onPresetDeleted: (presetId: string) => void;
}

const ChatFormFields: React.FC<ChatFormFieldsProps> = ({
  form,
  onFormUpdated,
  selectedPresetId,
  onPromptSelectionChange,
  onPresetSaved,
  onPresetDeleted,
}) => {
  const navigate = useNavigate();
  const isSystemDefaultSelected =
    selectedPresetId === SYSTEM_DEFAULT_PROMPT_SELECTION;

  return (
    <Stack>
      <TextInput
        label="Story Title"
        placeholder="Enter a title for your story..."
        size="lg"
        withAsterisk
        autoFocus
        styles={{
          label: {
            width: "100%",
            textAlign: "center",
            fontSize: "0.85rem",
          },
          input: {
            fontSize: "1.2rem",
            fontWeight: 600,
            textAlign: "center",
          },
        }}
        {...form.getInputProps("chatTitle")}
        onChange={(e) => {
          form.getInputProps("chatTitle").onChange(e);
          onFormUpdated({ chatTitle: e.currentTarget.value });
        }}
      />

      <ChatPromptEditor
        builtInOptions={[
          {
            value: SYSTEM_DEFAULT_PROMPT_SELECTION,
            label: SYSTEM_DEFAULT_PROMPT_SELECTION,
          },
        ]}
        selectionValue={selectedPresetId}
        onSelectionChange={onPromptSelectionChange}
        promptValue={form.values.prompt}
        onPromptChange={(value) => {
          form.setFieldValue("prompt", value);
          onFormUpdated({ prompt: value });
        }}
        promptReadOnly={isSystemDefaultSelected}
        selectionClearable
        selectionPlaceholder="Select a prompt..."
        emphasizeSelectionArea
        canEditDefaultPrompt={isSystemDefaultSelected}
        onEditDefaultPrompt={
          isSystemDefaultSelected
            ? () => navigate("/system-prompts#defaultThirdPersonPrompt")
            : undefined
        }
        onPresetSaved={onPresetSaved}
        onPresetDeleted={onPresetDeleted}
      />
    </Stack>
  );
};

interface ChatEditorFooterProps {
  chatId: string;
}

const ChatEditorFooter: React.FC<ChatEditorFooterProps> = ({ chatId }) => (
  <Group justify="center" mt="xl">
    <ChatDeleteControl chatId={chatId} />
  </Group>
);
