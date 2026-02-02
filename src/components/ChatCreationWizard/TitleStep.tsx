import { TextInput, Stack, Button, Textarea, Group } from "@mantine/core";
import { RiArrowRightLine } from "react-icons/ri";
import { StoryGeneratorModal } from "../StoryEditor/StoryGeneratorModal";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";

interface TitleStepProps {
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
  onNext: () => void;
}

export const TitleStep: React.FC<TitleStepProps> = ({
  state,
  updateState,
  onNext,
}) => {
  const canProceed =
    state.title.trim().length > 0 && state.story.trim().length > 0;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <TextInput
          label="Story Title"
          placeholder="Enter a title for your story..."
          autoFocus
          value={state.title}
          onChange={(e) => updateState({ title: e.currentTarget.value })}
          size="md"
          withAsterisk
        />

        <Textarea
          label="Story Context"
          placeholder="In a land far, far away..."
          description="Describe the world, characters, and setting for your story. This will be the first message in your chat."
          withAsterisk
          autosize
          minRows={12}
          value={state.story}
          onChange={(e) => updateState({ story: e.currentTarget.value })}
        />
      </Stack>

      <Group justify="space-between" align="center">
        <StoryGeneratorModal
          onStoryGenerated={(story) => updateState({ story })}
        />
        <Button
          onClick={onNext}
          disabled={!canProceed}
          rightSection={<RiArrowRightLine size={18} />}
          size="md"
        >
          Next
        </Button>
      </Group>
    </Stack>
  );
};
