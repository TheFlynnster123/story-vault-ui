import { Box, Group, Switch, Text } from "@mantine/core";
import { RiHistoryLine } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { FlowStyles } from "../../Chat/components/Chat/Flow/FlowStyles";
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
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: FlowStyles.buttonBackground,
        borderRadius: "4px",
      }}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        <FlowButton
          onClick={onNavigate}
          leftSection={
            <RiHistoryLine size={18} color={Theme.history.primary} />
          }
        >
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Continuity Histories
            </Text>
            <Text size="xs" c="dimmed">
              {activeCount} active / {store.histories.length} total
            </Text>
          </Group>
        </FlowButton>
      </Box>
      <Switch
        aria-label="Enable Continuity Histories"
        checked={store.settings.enabled}
        disabled={isLoading}
        size="sm"
        mr={8}
        onChange={(event) =>
          void d.ContinuityHistoriesService(chatId).updateSettings({
            enabled: event.currentTarget.checked,
            messagesSinceLastRefresh: 0,
          })
        }
      />
    </Box>
  );
};
