import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiChatSettingsLine } from "react-icons/ri";
import {
  Title,
  TextInput,
  Textarea,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Select,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { ChatSettings } from "../models/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { ChatDeleteControl } from "./ChatEditor/ChatDeleteControl";
import { BackgroundPhotoUploader } from "./ChatEditor/BackgroundPhotoUploader";
import { Page } from "./Page";
import { useChatSettings } from "../queries/chat-settings/useChatSettings";
import { ChatTheme } from "../theme/chatTheme";

export const ChatEditorPage: React.FC = () => {
  const { id: chatIdFromParams } = useParams();
  const {
    chatId,
    isEditMode,
    form,
    handlePhotoUpload,
    removePhoto,
    handleCivitJobIdChange,
    handleSubmit,
    handleGoBack,
  } = useChatEditor(chatIdFromParams);

  return (
    <Page>
      <Paper
        component="form"
        onSubmit={form.onSubmit(handleSubmit)}
        p={30}
        style={{
          background: ChatTheme.page.paperBackground,
          backdropFilter: ChatTheme.page.backdropBlur,
          color: ChatTheme.page.text,
        }}
      >
        <ChatEditorHeader
          isEditMode={isEditMode}
          onGoBack={handleGoBack}
          isFormDirty={form.isDirty()}
        />

        <Stack>
          <ChatFormFields form={form} />

          <BackgroundPhotoUploader
            chatId={chatId}
            backgroundPhotoBase64={form.values.backgroundPhotoBase64}
            backgroundPhotoCivitJobId={form.values.backgroundPhotoCivitJobId}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
            onCivitJobIdChange={handleCivitJobIdChange}
          />
        </Stack>

        <ChatEditorFooter chatId={chatId} isEditMode={isEditMode} />
      </Paper>
    </Page>
  );
};

interface ChatEditorHeaderProps {
  isEditMode: boolean;
  onGoBack: () => void;
  isFormDirty: boolean;
}

const ChatEditorHeader: React.FC<ChatEditorHeaderProps> = ({
  isEditMode,
  onGoBack,
  isFormDirty,
}) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={ChatTheme.page.text} />
        </ActionIcon>
        <RiChatSettingsLine size={24} color={ChatTheme.chatSettings.primary} />
        <Title
          order={2}
          fw={400}
          style={{ color: ChatTheme.chatSettings.primary }}
        >
          {isEditMode ? "Edit Chat" : "Create New Chat"}
        </Title>
      </Group>
      <Button type="submit" disabled={!isFormDirty}>
        {isEditMode ? "Save Changes" : "Create Chat"}
      </Button>
    </Group>
    <Divider mb="xl" style={{ borderColor: ChatTheme.chatSettings.border }} />
  </>
);

const useChatEditor = (chatIdFromParams: string | undefined) => {
  const [chatId] = useState(chatIdFromParams ?? uuidv4());
  const navigate = useNavigate();
  const isEditMode =
    chatIdFromParams != undefined && chatIdFromParams !== "new";
  const { chatSettings, saveChatSettings } = useChatSettings(
    chatId,
    !isEditMode
  );

  const form = useForm<ChatSettings>({
    initialValues: {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "",
      backgroundPhotoBase64: undefined as string | undefined,
      backgroundPhotoCivitJobId: undefined as string | undefined,
      promptType: "First Person Character",
      customPrompt: "",
      story: "",
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
        story: chatSettings.story || "",
      };
      form.setInitialValues(values);
      form.reset();
    }
  }, [chatSettings]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        form.setFieldValue("backgroundPhotoBase64", base64String);
        // Clear CivitJob when uploading a new photo
        form.setFieldValue("backgroundPhotoCivitJobId", undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    form.setFieldValue("backgroundPhotoBase64", undefined);
    form.setFieldValue("backgroundPhotoCivitJobId", undefined);
  };

  const handleCivitJobIdChange = (jobId: string | undefined) => {
    form.setFieldValue("backgroundPhotoCivitJobId", jobId);
    // Clear uploaded photo when setting CivitJob
    if (jobId) {
      form.setFieldValue("backgroundPhotoBase64", undefined);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    const settingsToSave: ChatSettings = {
      ...values,
      chatTitle: values.chatTitle.trim(),
    };

    await saveChatSettings(settingsToSave);
    navigate(`/chat/${chatId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleDeleteSuccess = () => {
    navigate("/chat");
  };

  return {
    chatId,
    isEditMode,
    form,
    handlePhotoUpload,
    removePhoto,
    handleCivitJobIdChange,
    handleSubmit,
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
}

const ChatFormFields: React.FC<ChatFormFieldsProps> = ({ form }) => (
  <Stack>
    <TextInput
      label="Story Title"
      placeholder="Enter a title for your story..."
      withAsterisk
      autoFocus
      {...form.getInputProps("chatTitle")}
    />

    <Select
      label="Prompt"
      data={["First Person Character", "Manual"]}
      {...form.getInputProps("promptType")}
    />

    {form.values.promptType === "Manual" && (
      <Textarea
        label="Custom Prompt"
        placeholder="Enter your custom prompt..."
        p="10"
        {...form.getInputProps("customPrompt")}
      />
    )}

    <Textarea
      label="Story"
      placeholder="Enter story details..."
      autosize
      minRows={15}
      {...form.getInputProps("story")}
    />
  </Stack>
);

interface ChatEditorFooterProps {
  chatId: string;
  isEditMode: boolean;
}

const ChatEditorFooter: React.FC<ChatEditorFooterProps> = ({
  chatId,
  isEditMode,
}) => (
  <Group justify="center" mt="xl">
    {isEditMode && <ChatDeleteControl chatId={chatId} />}
  </Group>
);
