import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine } from "react-icons/ri";
import {
  Container,
  Title,
  TextInput,
  Textarea,
  Button,
  Group,
  Paper,
  ActionIcon,
  Image,
  FileButton,
  Text,
  Stack,
  Select,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { ChatSettings } from "../models/ChatSettings";
import { useChatSettings } from "../hooks/queries/useChatSettings";
import { ChatDeleteControl } from "../Chat/ChatControls/ChatDeleteControl";
import { v4 as uuidv4 } from "uuid";

export const ChatEditorPage: React.FC = () => {
  const { id: chatIdFromParams } = useParams();
  const [chatId] = useState(chatIdFromParams ?? uuidv4());
  const navigate = useNavigate();
  const { chatSettings, saveChatSettings } = useChatSettings(chatId);

  const form = useForm({
    initialValues: {
      chatTitle: "",
      backgroundPhotoBase64: undefined as string | undefined,
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
      form.setValues({
        chatTitle: chatSettings.chatTitle || "",
        backgroundPhotoBase64: chatSettings.backgroundPhotoBase64,
        promptType: chatSettings.promptType || "First Person Character",
        customPrompt: chatSettings.customPrompt || "",
      });
    }
  }, [chatSettings]);
  const backgroundPhotoBase64 = form.values.backgroundPhotoBase64;

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

  return (
    <Container size="md" my="xl">
      <Paper
        component="form"
        onSubmit={form.onSubmit(handleSubmit)}
        withBorder
        shadow="md"
        p={30}
        mt={30}
        radius="md"
      >
        <Group justify="space-between" align="center" mb="xl">
          <ActionIcon onClick={handleGoBack} variant="default" size="lg">
            <RiArrowLeftLine />
          </ActionIcon>
          <Title order={2}>
            {chatIdFromParams ? "Edit Chat" : "Create New Chat"}
          </Title>
        </Group>

        <Stack>
          <TextInput
            label="Story Title"
            placeholder="Enter a title for your story..."
            withAsterisk
            autoFocus
            {...form.getInputProps("chatTitle")}
          />

          <div>
            <Text size="sm" fw={500}>
              Background Photo
            </Text>
            {backgroundPhotoBase64 ? (
              <Paper withBorder p="sm" mt="xs">
                <Image
                  src={backgroundPhotoBase64}
                  alt="Background preview"
                  radius="sm"
                />
                <Button
                  variant="outline"
                  color="red"
                  fullWidth
                  mt="sm"
                  onClick={removePhoto}
                >
                  Remove Photo
                </Button>
              </Paper>
            ) : (
              <Group justify="center" mt="xs">
                <FileButton
                  onChange={(file) =>
                    handlePhotoUpload({
                      target: { files: file ? [file] : null },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  accept="image/png,image/jpeg,image/gif"
                >
                  {(props) => <Button {...props}>Upload Image</Button>}
                </FileButton>
              </Group>
            )}
          </div>

          <Select
            label="Prompt"
            data={["First Person Character", "Manual"]}
            {...form.getInputProps("promptType")}
          />

          {form.values.promptType === "Manual" && (
            <Textarea
              label="Custom Prompt"
              placeholder="Enter your custom prompt..."
              {...form.getInputProps("customPrompt")}
            />
          )}
        </Stack>

        <Group justify="space-between" mt="xl">
          {chatIdFromParams && (
            <ChatDeleteControl
              chatId={chatId}
              onDeleteSuccess={() => navigate("/chat")}
            />
          )}
          <Group>
            <Button variant="default" onClick={handleGoBack}>
              Cancel
            </Button>
            <Button type="submit">
              {chatIdFromParams ? "Save Changes" : "Create Chat"}
            </Button>
          </Group>
        </Group>
      </Paper>
    </Container>
  );
};
