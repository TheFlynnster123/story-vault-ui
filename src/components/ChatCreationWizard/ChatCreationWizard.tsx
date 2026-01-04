import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stepper,
  Container,
  Title,
  Stack,
  Group,
  ActionIcon,
} from "@mantine/core";
import { RiArrowLeftLine, RiPencilFill, RiSettings4Line } from "react-icons/ri";
import { LuBookOpen } from "react-icons/lu";
import { BsChatLeftText } from "react-icons/bs";
import { v4 as uuidv4 } from "uuid";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";
import { createInitialWizardState } from "./ChatCreationWizardState";
import { TitleStep } from "./TitleStep";
import { StoryStep } from "./StoryStep";
import { PromptStep } from "./PromptStep";
import { ChatSettingsStep } from "./ChatSettingsStep";
import type { ChatSettings } from "../../services/Chat/ChatSettings";
import { Theme } from "../Common/Theme";
import { useCreateChat } from "./useCreateChat";

export const ChatCreationWizard: React.FC = () => {
  const [state, setState] = useState<ChatCreationWizardState>(
    createInitialWizardState()
  );
  const [chatId] = useState(uuidv4());
  const navigate = useNavigate();
  const { createChat, isCreating } = useCreateChat();

  const updateState = (updates: Partial<ChatCreationWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => updateState({ step: state.step + 1 });
  const prevStep = () => updateState({ step: state.step - 1 });
  const goHome = () => navigate("/");

  const handleCreate = async () => {
    try {
      const settings: ChatSettings = {
        timestampCreatedUtcMs: Date.now(),
        chatTitle: state.title.trim(),
        prompt: state.prompt || "",
        backgroundPhotoBase64: state.backgroundPhotoBase64,
        backgroundPhotoCivitJobId: state.backgroundPhotoCivitJobId,
      };

      await createChat({
        chatId,
        settings,
        story: state.story.trim(),
      });

      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="center" align="center" pos="relative">
          <ActionIcon
            onClick={goHome}
            color={Theme.chatSettings.primary}
            variant="subtle"
            size="lg"
            pos="absolute"
            left={0}
          >
            <RiArrowLeftLine size={24} />
          </ActionIcon>
          <Title
            order={1}
            style={{ color: Theme.chatSettings.primary, fontWeight: 400 }}
          >
            Create New Chat
          </Title>
        </Group>

        <Stepper
          active={state.step}
          onStepClick={(stepIndex) => updateState({ step: stepIndex })}
        >
          <Stepper.Step label="Title" icon={<RiPencilFill size={18} />} />
          <Stepper.Step label="Story" icon={<LuBookOpen size={18} />} />
          <Stepper.Step label="Prompt" icon={<BsChatLeftText size={18} />} />
          <Stepper.Step
            label="Background Photo"
            icon={<RiSettings4Line size={18} />}
          />
        </Stepper>

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
              onBack={prevStep}
            />
          )}
          {state.step === 2 && (
            <PromptStep
              state={state}
              updateState={updateState}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {state.step === 3 && (
            <ChatSettingsStep
              chatId={chatId}
              state={state}
              updateState={updateState}
              onCreate={handleCreate}
              onBack={prevStep}
              isCreating={isCreating}
            />
          )}
        </div>
      </Stack>
    </Container>
  );
};
