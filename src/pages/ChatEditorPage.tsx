import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine } from "react-icons/ri";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { ChatSettings } from "../models/ChatSettings";
import { useChatSettings } from "../hooks/queries/useChatSettings";
import { v4 as uuidv4 } from "uuid";
import { ChatDeleteControl } from "./ChatEditor/ChatDeleteControl";
import { BackgroundPhotoUploader } from "./ChatEditor/BackgroundPhotoUploader";
import { Page } from "./Page";

export const ChatEditorPage: React.FC = () => {
  const { id: chatIdFromParams } = useParams();
  const {
    chatId,
    isEditMode,
    form,
    handlePhotoUpload,
    removePhoto,
    handleSubmit,
    handleGoBack,
    handleDeleteSuccess,
  } = useChatEditor(chatIdFromParams);

  return (
    <Page>
      <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} p={30}>
        <ChatEditorHeader
          isEditMode={isEditMode}
          onGoBack={handleGoBack}
          isFormDirty={form.isDirty()}
        />

        <Stack>
          <ChatFormFields form={form} />

          <BackgroundPhotoUploader
            backgroundPhotoBase64={form.values.backgroundPhotoBase64}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={removePhoto}
          />
        </Stack>

        <ChatEditorFooter
          chatId={chatId}
          isEditMode={isEditMode}
          onDeleteSuccess={handleDeleteSuccess}
        />
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
  <Group justify="space-between" align="center" mb="xl">
    <Group>
      <ActionIcon onClick={onGoBack} variant="gradient" size="lg">
        <RiArrowLeftLine />
      </ActionIcon>
      <Title order={2}>{isEditMode ? "Edit Chat" : "Create New Chat"}</Title>
    </Group>
    <Button type="submit" disabled={!isFormDirty}>
      {isEditMode ? "Save Changes" : "Create Chat"}
    </Button>
  </Group>
);

const useChatEditor = (chatIdFromParams: string | undefined) => {
  const [chatId] = useState(chatIdFromParams ?? uuidv4());
  const navigate = useNavigate();
  const { chatSettings, saveChatSettings } = useChatSettings(chatId);
  const isEditMode = Boolean(chatIdFromParams);

  const form = useForm<ChatSettings>({
    initialValues: {
      chatTitle: "",
      backgroundPhotoBase64: undefined as string | undefined,
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
        chatTitle: chatSettings.chatTitle || "",
        backgroundPhotoBase64: chatSettings.backgroundPhotoBase64,
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
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    form.setFieldValue("backgroundPhotoBase64", undefined);
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
  onDeleteSuccess: () => void;
}

const ChatEditorFooter: React.FC<ChatEditorFooterProps> = ({
  chatId,
  isEditMode,
  onDeleteSuccess,
}) => (
  <Group justify="center" mt="xl">
    {isEditMode && (
      <ChatDeleteControl chatId={chatId} onDeleteSuccess={onDeleteSuccess} />
    )}
  </Group>
);
