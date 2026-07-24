import { normalizeSheetItems } from "./CharacterDescription";

export type CharacterUpdateProposalSource = "automatic" | "manual";

export interface CharacterUpdateChange {
  characterId: string;
  characterName: string;
  baseUpdatedAt?: string;
  isNew: boolean;
  previousSheetItems: string[];
  proposedSheetItems?: string[];
  previousDetectedActive?: boolean;
  proposedDetectedActive?: boolean;
}

export interface CharacterUpdateProposal {
  id: string;
  source: CharacterUpdateProposalSource;
  createdAt: string;
  changes: CharacterUpdateChange[];
}

export const createCharacterUpdateProposal = (
  source: CharacterUpdateProposalSource,
  changes: CharacterUpdateChange[],
): CharacterUpdateProposal => ({
  id: crypto.randomUUID(),
  source,
  createdAt: new Date().toISOString(),
  changes,
});

export const proposalChangesSheet = (change: CharacterUpdateChange): boolean =>
  change.proposedSheetItems !== undefined &&
  hasCharacterSheetItemChanges(
    change.previousSheetItems,
    change.proposedSheetItems,
  );

export const proposalChangesActivity = (
  change: CharacterUpdateChange,
): boolean => change.proposedDetectedActive !== undefined;

export interface CharacterSheetItemDiff {
  added: string[];
  removed: string[];
}

export const getCharacterSheetItemDiff = (
  previousItems: readonly string[],
  proposedItems: readonly string[],
): CharacterSheetItemDiff => {
  const previous = normalizeSheetItems(previousItems);
  const proposed = normalizeSheetItems(proposedItems);
  const previousSet = new Set(previous);
  const proposedSet = new Set(proposed);

  return {
    added: proposed.filter((item) => !previousSet.has(item)),
    removed: previous.filter((item) => !proposedSet.has(item)),
  };
};

export const hasCharacterSheetItemChanges = (
  previousItems: readonly string[],
  proposedItems: readonly string[],
): boolean => {
  const diff = getCharacterSheetItemDiff(previousItems, proposedItems);
  return diff.added.length > 0 || diff.removed.length > 0;
};

export const selectCharacterUpdateChanges = (
  proposal: CharacterUpdateProposal,
  characterIds: string[],
): CharacterUpdateProposal => {
  const selectedCharacterIds = new Set(characterIds);
  return {
    ...proposal,
    changes: proposal.changes.filter((change) =>
      selectedCharacterIds.has(change.characterId),
    ),
  };
};
