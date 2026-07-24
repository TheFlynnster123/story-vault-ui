import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import type {
  CharacterUpdateChange,
  CharacterUpdateProposal,
} from "../services/CharacterUpdateProposal";
import {
  getCharacterSheetItemDiff,
  proposalChangesActivity,
  proposalChangesSheet,
} from "../services/CharacterUpdateProposal";

interface CharacterUpdateReviewModalProps {
  proposal: CharacterUpdateProposal | undefined;
  opened: boolean;
  isApplying: boolean;
  error: string | undefined;
  onClose: () => void;
  onApprove: (characterIds: string[]) => void;
  onDiscard: () => void;
}

type CharacterDecision = "confirm" | "dismiss";

export const CharacterUpdateReviewModal: React.FC<
  CharacterUpdateReviewModalProps
> = ({
  proposal,
  opened,
  isApplying,
  error,
  onClose,
  onApprove,
  onDiscard,
}) => {
  const [decisions, setDecisions] = useState<Record<string, CharacterDecision>>(
    {},
  );

  useEffect(() => {
    setDecisions({});
  }, [proposal?.id]);

  if (!proposal) return null;

  const allCharactersDecided = proposal.changes.every(
    (change) => decisions[change.characterId],
  );
  const confirmedCharacterIds = proposal.changes
    .filter((change) => decisions[change.characterId] === "confirm")
    .map((change) => change.characterId);
  const applyDecisions = () => {
    if (confirmedCharacterIds.length === 0) {
      onDiscard();
      return;
    }
    onApprove(confirmedCharacterIds);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Review character updates"
      size="xl"
    >
      <Stack gap="md">
        <Badge variant="light" style={{ alignSelf: "flex-start" }}>
          {proposal.source === "automatic"
            ? "Automatic synchronization"
            : "Manual request"}
        </Badge>
        <Text size="sm" c="dimmed">
          Confirm or dismiss the prepared changes for each character. Nothing
          below changes Character Sheets or activity until you apply your
          decisions.
        </Text>

        {error && <Alert color="red">{error}</Alert>}

        {proposal.changes.map((change) => (
          <CharacterChangePreview
            key={change.characterId}
            change={change}
            decision={decisions[change.characterId]}
            disabled={isApplying}
            onDecision={(decision) =>
              setDecisions((current) => ({
                ...current,
                [change.characterId]: decision,
              }))
            }
          />
        ))}

        <Group justify="space-between">
          <Button
            color="red"
            variant="subtle"
            disabled={isApplying}
            onClick={onDiscard}
          >
            Dismiss all
          </Button>
          <Group>
            <Button variant="default" disabled={isApplying} onClick={onClose}>
              Review later
            </Button>
            <Button
              loading={isApplying}
              disabled={!allCharactersDecided}
              onClick={applyDecisions}
            >
              Apply decisions
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

const CharacterChangePreview: React.FC<{
  change: CharacterUpdateChange;
  decision: CharacterDecision | undefined;
  disabled: boolean;
  onDecision: (decision: CharacterDecision) => void;
}> = ({ change, decision, disabled, onDecision }) => (
  <Paper withBorder p="md">
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>{change.characterName}</Text>
        {change.isNew && <Badge color="indigo">New character</Badge>}
      </Group>

      {proposalChangesActivity(change) && <ActivityChange change={change} />}

      {proposalChangesSheet(change) && <SheetChange change={change} />}

      <Group justify="flex-end">
        <Button
          size="xs"
          color="red"
          variant={decision === "dismiss" ? "filled" : "light"}
          disabled={disabled}
          onClick={() => onDecision("dismiss")}
        >
          Dismiss {change.characterName}
        </Button>
        <Button
          size="xs"
          color="green"
          variant={decision === "confirm" ? "filled" : "light"}
          disabled={disabled}
          onClick={() => onDecision("confirm")}
        >
          Confirm {change.characterName}
        </Button>
      </Group>
    </Stack>
  </Paper>
);

const ActivityChange: React.FC<{ change: CharacterUpdateChange }> = ({
  change,
}) => (
  <Stack gap={2}>
    <Text size="sm" fw={500}>
      Automatic activity
    </Text>
    <Text size="sm" c="dimmed">
      {change.isNew ? "New" : toActivityLabel(change.previousDetectedActive)} →{" "}
      {toActivityLabel(change.proposedDetectedActive)}
    </Text>
  </Stack>
);

const SheetChange: React.FC<{ change: CharacterUpdateChange }> = ({
  change,
}) => {
  const diff = getCharacterSheetItemDiff(
    change.previousSheetItems,
    change.proposedSheetItems ?? [],
  );

  return (
    <Stack gap="xs">
      {diff.removed.length > 0 && (
        <SheetItems title="Removed" items={diff.removed} />
      )}
      {diff.added.length > 0 && (
        <SheetItems title="Added" items={diff.added} />
      )}
    </Stack>
  );
};

const SheetItems: React.FC<{ title: string; items: string[] }> = ({
  title,
  items,
}) => (
  <Stack gap={2}>
    <Text size="sm" fw={500}>
      {title}
    </Text>
    <List size="sm">
      {items.map((item) => (
        <List.Item key={item}>{item}</List.Item>
      ))}
    </List>
  </Stack>
);

const toActivityLabel = (active: boolean | undefined): string =>
  active ? "Active" : "Inactive";
