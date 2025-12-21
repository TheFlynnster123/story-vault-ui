import { Stack, Text, Paper, Group, Badge } from "@mantine/core";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";

interface ConfirmStepProps {
  state: ChatCreationWizardState;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({ state }) => (
  <Stack>
    <Text size="sm" c="dimmed">
      Review your story details before creating:
    </Text>

    <Paper withBorder p="md">
      <Stack gap="xs">
        <Group>
          <Text fw={500}>Title:</Text>
          <Text>{state.title}</Text>
        </Group>

        <Group>
          <Text fw={500}>Prompt Type:</Text>
          <Badge variant="light">{state.promptType}</Badge>
        </Group>

        {state.customPrompt && (
          <div>
            <Text fw={500}>Custom Prompt:</Text>
            <Text size="sm" c="dimmed">
              {state.customPrompt}
            </Text>
          </div>
        )}

        <div>
          <Text fw={500}>Story:</Text>
          <Text size="sm" lineClamp={8}>
            {state.story}
          </Text>
        </div>

        {state.generateImage && (
          <Group>
            <Text fw={500}>Cover Image:</Text>
            <Badge variant="light" color="blue">
              Will generate
            </Badge>
          </Group>
        )}
      </Stack>
    </Paper>
  </Stack>
);
