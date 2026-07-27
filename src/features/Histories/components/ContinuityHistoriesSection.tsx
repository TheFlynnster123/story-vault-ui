import { Badge, Button, Group, Paper, Stack, Switch, Text } from "@mantine/core";
import { RiHistoryLine } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import { useContinuityHistories } from "../hooks/useContinuityHistories";

interface ContinuityHistoriesSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const ContinuityHistoriesSection: React.FC<
  ContinuityHistoriesSectionProps
> = ({ chatId, onNavigate }) => {
  const { store, isLoading } = useContinuityHistories(chatId);
  const activeCount = store.histories.filter(
    (history) => history.inclusion !== "never",
  ).length;

  return (
    <Paper
      p="md"
      style={{
        backgroundColor: Theme.history.backgroundPrimary,
        border: `1px solid ${Theme.history.border}`,
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <RiHistoryLine size={18} color={Theme.history.primary} />
            <Text fw={600}>Continuity Histories</Text>
            {activeCount > 0 && (
              <Badge color="green" variant="light">
                {activeCount}
              </Badge>
            )}
          </Group>
          <Switch
            aria-label="Enable Continuity Histories"
            checked={store.settings.enabled}
            disabled={isLoading}
            onChange={(event) =>
              void d.ContinuityHistoriesService(chatId).updateSettings({
                enabled: event.currentTarget.checked,
                messagesSinceLastRefresh: 0,
              })
            }
          />
        </Group>
        <Text size="xs" c="dimmed">
          LLM-maintained histories of plot threads, places, objects, factions,
          relationships, and other cross-scene continuity.
        </Text>
        <Button
          size="xs"
          variant="light"
          color="green"
          onClick={onNavigate}
        >
          Manage Histories
        </Button>
      </Stack>
    </Paper>
  );
};
