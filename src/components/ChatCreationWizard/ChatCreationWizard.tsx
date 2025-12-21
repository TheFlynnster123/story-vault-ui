import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, Container, Title, Stack } from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";
import { createInitialWizardState } from "../../models/ChatCreationWizardState";
import { TitleStep } from "./TitleStep";
import { StoryStep } from "./StoryStep";
import { ChatSettingsStep } from "./ChatSettingsStep";
import { d } from "../../app/Dependencies/Dependencies";
import type { ChatSettings } from "../../models/ChatSettings";

export const ChatCreationWizard: React.FC = () => {
  const [state, setState] = useState<ChatCreationWizardState>(
    createInitialWizardState()
  );
  const [chatId] = useState(uuidv4());
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const updateState = (updates: Partial<ChatCreationWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => updateState({ step: state.step + 1 });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createChat();
      await d.RecentChatsService().recordNavigation(chatId);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
      setIsCreating(false);
    }
  };

  const createChat = async () => {
    await saveChatSettings();
    await initializeStory();
  };

  const saveChatSettings = async () => {
    const settings: ChatSettings = {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: state.title.trim(),
      promptType: state.promptType,
      customPrompt: state.customPrompt,
      backgroundPhotoBase64: state.backgroundPhotoBase64,
      backgroundPhotoCivitJobId: state.backgroundPhotoCivitJobId,
    };

    await d.ChatSettingsService(chatId).save(settings);
  };

  const initializeStory = async () => {
    await d.ChatService(chatId).InitializeStory(state.story.trim());
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={1} ta="center">
          Create New Chat
        </Title>

        <div style={{ minHeight: "400px" }}>
          {state.step === 0 && (
            <TitleStep
              state={state}
              updateState={updateState}
              onNext={nextStep}
            />
          )}
          {state.step === 1 && (
            <StoryStep
              state={state}
              updateState={updateState}
              onNext={nextStep}
            />
          )}
          {state.step === 2 && (
            <ChatSettingsStep
              chatId={chatId}
              state={state}
              updateState={updateState}
              onCreate={handleCreate}
              isCreating={isCreating}
            />
          )}
        </div>

        <Stepper
          active={state.step}
          onStepClick={(stepIndex) => updateState({ step: stepIndex })}
        >
          <Stepper.Step label="Title" description="Name your story" />
          <Stepper.Step label="Story" description="Set the scene" />
          <Stepper.Step label="Settings" description="Configure chat" />
        </Stepper>
      </Stack>
    </Container>
  );
};
