import { TextInput, Stack, Button, Text } from "@mantine/core";
import { RiArrowRightLine } from "react-icons/ri";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";

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
  const canProceed = state.title.trim().length > 0;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Give your story a memorable title.
        </Text>
        <TextInput
          label="Story Title"
          placeholder="Enter a title for your story..."
          withAsterisk
          autoFocus
          value={state.title}
          onChange={(e) => updateState({ title: e.currentTarget.value })}
          size="md"
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
