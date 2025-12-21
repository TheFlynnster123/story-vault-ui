import { Stack, Text, Switch } from "@mantine/core";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";

interface ImageGenerationStepProps {
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
}

export const ImageGenerationStep: React.FC<ImageGenerationStepProps> = ({
  state,
  updateState,
}) => (
  <Stack>
    <Text size="sm" c="dimmed">
      Generate a cover image for your story (optional). Image generation will
      happen after chat creation.
    </Text>

    <Switch
      label="Generate cover image"
      checked={state.generateImage}
      onChange={(e) => updateState({ generateImage: e.currentTarget.checked })}
    />

    <Text size="xs" c="dimmed">
      You can also add or generate images later from the chat settings.
    </Text>
  </Stack>
);
