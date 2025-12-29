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
  Select,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { ChatSettings } from "../services/Chat/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { ChatDeleteControl } from "../components/ChatEditor/ChatDeleteControl";
import { BackgroundPhotoUploader } from "../components/ChatEditor/BackgroundPhotoUploader";
import { Page } from "./Page";
import { useChatSettings } from "../components/Chat/useChatSettings";
import { Theme } from "../components/Common/Theme";
import { d } from "../services/Dependencies";

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
  } = useChatEditor(chatIdFromParams);

  return (
    <Page>
      <Paper mt={20}>
        <ChatEditorHeader onGoBack={handleGoBack} />

        <Stack>
          <ChatFormFields form={form} onFormUpdated={onFormUpdated} />

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

  const form = useForm<ChatSettings>({
    initialValues: {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "",
      backgroundPhotoBase64: undefined as string | undefined,
      backgroundPhotoCivitJobId: undefined as string | undefined,
      promptType: "First Person Character",
      customPrompt: "",
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
        promptType: chatSettings.promptType || "First Person Character",
        customPrompt: chatSettings.customPrompt || "",
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
    const settingsToSave: ChatSettings = {
      ...form.values,
      chatTitle: form.values.chatTitle.trim(),
    };
    await d.ChatSettingsService(chatId).save(settingsToSave);
    navigate(-1);
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
  };
};

interface ChatFormFieldsProps {
  form: {
    getInputProps: (field: string) => any;
    values: {
      promptType: string;
    };
  };
  onFormUpdated: (overrides?: Partial<ChatSettings>) => void;
}

const ChatFormFields: React.FC<ChatFormFieldsProps> = ({
  form,
  onFormUpdated,
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

    <Select
      label="Prompt"
      data={["First Person Character", "Manual"]}
      {...form.getInputProps("promptType")}
      onChange={(value) => {
        form.getInputProps("promptType").onChange(value);
        onFormUpdated({ promptType: value as any });
      }}
    />

    {form.values.promptType === "Manual" && (
      <Textarea
        label="Custom Prompt"
        placeholder="Enter your custom prompt..."
        p="10"
        {...form.getInputProps("customPrompt")}
        onChange={(e) => {
          form.getInputProps("customPrompt").onChange(e);
          onFormUpdated({ customPrompt: e.currentTarget.value });
        }}
      />
    )}
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
