import { useEffect, useState } from "react";
import { Alert, Button, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { RiCloseLine, RiRefreshLine, RiTreasureMapLine } from "react-icons/ri";
import { d } from "../../../services/Dependencies";

interface PlanSuggestionModalProps {
  opened: boolean;
  onClose: () => void;
  chatId: string;
  planDefinitionId: string;
  priorContent?: string;
  onSelect: (suggestion: string) => void;
}

export const PlanSuggestionModal: React.FC<PlanSuggestionModalProps> = ({
  opened,
  onClose,
  chatId,
  planDefinitionId,
  priorContent,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;

    let isMounted = true;
    setSuggestions([]);
    setError(null);
    setIsLoading(true);

    d.PlanGenerationService(chatId)
      .suggestPlanDirections(planDefinitionId, priorContent)
      .then((nextSuggestions) => {
        if (!isMounted) return;
        setSuggestions(nextSuggestions);
        if (nextSuggestions.length === 0) {
          setError("No suggestions were returned.");
        }
      })
      .catch((e) => {
        d.ErrorService().log("Failed to suggest plans", e);
        if (isMounted) setError("Failed to suggest plans.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chatId, opened, planDefinitionId, priorContent]);

  const retry = () => {
    setSuggestions([]);
    setError(null);
    setIsLoading(true);

    d.PlanGenerationService(chatId)
      .suggestPlanDirections(planDefinitionId, priorContent)
      .then((nextSuggestions) => {
        setSuggestions(nextSuggestions);
        if (nextSuggestions.length === 0) {
          setError("No suggestions were returned.");
        }
      })
      .catch((e) => {
        d.ErrorService().log("Failed to suggest plans", e);
        setError("Failed to suggest plans.");
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Suggest plan">
      <Stack>
        <Text size="sm" c="dimmed">
          Choose a direction to generate the full plan from the latest chat
          context.
        </Text>

        {isLoading ? (
          <Group>
            <Loader size="sm" />
            <Text size="sm">Suggesting plans...</Text>
          </Group>
        ) : null}

        {error ? (
          <Alert color="red">
            <Group justify="space-between" align="center">
              <Text size="sm">{error}</Text>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<RiRefreshLine size={14} />}
                onClick={retry}
              >
                Retry
              </Button>
            </Group>
          </Alert>
        ) : null}

        {suggestions.map((suggestion, index) => (
          <Button
            key={`${suggestion}-${index}`}
            variant="light"
            color="teal"
            leftSection={<RiTreasureMapLine size={16} />}
            onClick={() => onSelect(suggestion)}
            styles={{
              root: {
                height: "auto",
                minHeight: 44,
                whiteSpace: "normal",
                textAlign: "left",
              },
              label: {
                whiteSpace: "normal",
                lineHeight: 1.35,
              },
              inner: {
                justifyContent: "flex-start",
              },
            }}
          >
            {suggestion}
          </Button>
        ))}

        <Group justify="flex-end">
          <Button
            variant="light"
            color="gray"
            leftSection={<RiCloseLine size={16} />}
            onClick={onClose}
          >
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
