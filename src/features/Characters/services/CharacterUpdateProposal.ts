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
  change.proposedSheetItems !== undefined;

export const proposalChangesActivity = (
  change: CharacterUpdateChange,
): boolean => change.proposedDetectedActive !== undefined;

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
