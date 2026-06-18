import { useState } from "react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { RiRefreshLine, RiTreasureMapLine } from "react-icons/ri";
import { d } from "../../../../../../services/Dependencies";
import { PlanSuggestionModal } from "../../../../../Plans/components/PlanSuggestionModal";

interface RegeneratePlanButtonProps {
  chatId: string;
  planDefinitionId: string;
  priorContent: string;
}

export const RegeneratePlanButton: React.FC<RegeneratePlanButtonProps> = ({
  chatId,
  planDefinitionId,
  priorContent,
}) => {
  const [opened, setOpened] = useState(false);
  const [suggestionOpened, setSuggestionOpened] = useState(false);
  const [direction, setDirection] = useState("");

  const closeModal = () => {
    setOpened(false);
    setDirection("");
  };

  const handleRegenerate = () => {
    d.PlanGenerationService(chatId).regeneratePlanFromMessage(
      planDefinitionId,
      priorContent,
    );
    closeModal();
  };

  const handleRegenerateWithDirection = () => {
    d.PlanGenerationService(chatId).regeneratePlanFromMessage(
      planDefinitionId,
      priorContent,
      direction.trim() || undefined,
    );
    closeModal();
  };

  const handleSuggestPlan = () => {
    closeModal();
    setSuggestionOpened(true);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    d.PlanGenerationService(chatId).regeneratePlanFromMessage(
      planDefinitionId,
      priorContent,
      suggestion,
    );
    setSuggestionOpened(false);
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="blue"
        onClick={() => setOpened(true)}
        leftSection={<RiRefreshLine size={14} />}
        styles={{
          root: {
            backgroundColor: "rgba(34, 139, 230, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(34, 139, 230, 0.35)",
            },
            minWidth: "36px",
            padding: "0 8px",
          },
        }}
        title="Regenerate Plan"
      >
        Regenerate
      </Button>

      <Modal opened={opened} onClose={closeModal} title="Regenerate Plan">
        <Stack>
          <Text size="sm" c="dimmed">
            Regenerate this plan from the latest chat context, or add direction
            for what should change.
          </Text>
          <Textarea
            label="Direction"
            placeholder="Enter direction here..."
            value={direction}
            onChange={(e) => setDirection(e.currentTarget.value)}
            minRows={5}
            autosize
            autoFocus
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="light"
              color="blue"
              leftSection={<RiRefreshLine size={14} />}
              onClick={handleRegenerate}
            >
              Regenerate
            </Button>
            <Button
              variant="light"
              color="cyan"
              leftSection={<RiTreasureMapLine size={14} />}
              onClick={handleSuggestPlan}
            >
              Suggest Plan
            </Button>
            <Button
              color="blue"
              leftSection={<RiRefreshLine size={14} />}
              onClick={handleRegenerateWithDirection}
            >
              With Direction
            </Button>
          </Group>
        </Stack>
      </Modal>

      <PlanSuggestionModal
        opened={suggestionOpened}
        onClose={() => setSuggestionOpened(false)}
        chatId={chatId}
        planDefinitionId={planDefinitionId}
        priorContent={priorContent}
        onSelect={handleSelectSuggestion}
      />
    </>
  );
};
