import { Textarea, Stack, Text, Button } from "@mantine/core";
import { RiArrowRightLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";

interface StoryStepProps {
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
  onNext: () => void;
}

export const StoryStep: React.FC<StoryStepProps> = ({
  state,
  updateState,
  onNext,
}) => {
  const canProceed = state.story.trim().length > 0;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Describe the world, characters, and setting for your story. This will
          be the first message in your chat and provide context for the AI.
        </Text>

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

      <Button
        onClick={onNext}
        disabled={!canProceed}
        rightSection={<RiArrowRightLine size={18} />}
        size="md"
        style={{ alignSelf: "center" }}
      >
        Next
      </Button>
    </Stack>
  );
};
