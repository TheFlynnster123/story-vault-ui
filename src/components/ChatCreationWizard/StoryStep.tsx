import { Textarea, Stack, Text, Button, Group } from "@mantine/core";
import { RiArrowRightLine, RiArrowLeftLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "./ChatCreationWizardState";

interface StoryStepProps {
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StoryStep: React.FC<StoryStepProps> = ({
  state,
  updateState,
  onNext,
  onBack,
}) => {
  const canProceed = state.story.trim().length > 0;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Textarea
          label="Story Context"
          placeholder="In a land far, far away..."
          withAsterisk
          autoFocus
          autosize
          minRows={15}
          value={state.story}
          onChange={(e) => updateState({ story: e.currentTarget.value })}
        />
      </Stack>

      <Text size="sm" c="dimmed">
        Describe the world, characters, and setting for your story. This will be
        the first message in your chat and provide context for the AI.
      </Text>

      <Group justify="center" gap="md">
        <Button
          onClick={onBack}
          variant="default"
          leftSection={<RiArrowLeftLine size={18} />}
          size="md"
        >
          Back
        </Button>
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
