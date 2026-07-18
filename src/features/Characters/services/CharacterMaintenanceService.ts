import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import type { CharacterDescription } from "./CharacterDescription";
import {
  createCharacterDescription,
  isCharacterActive,
} from "./CharacterDescription";
import type { ActiveCharacterSelection } from "./ActiveCharacterSelectionService";
import type { CharacterSheetUpdate } from "./CharacterSheetSyncService";
import {
  createCharacterUpdateProposal,
  type CharacterUpdateChange,
  type CharacterUpdateProposalSource,
} from "./CharacterUpdateProposal";
import { getCharacterSheetSettings } from "./CharacterSheetSettings";

export type CharacterMaintenanceStatus =
  "skipped" | "unchanged" | "proposal-created" | "failed";

export interface CharacterMaintenanceResult {
  status: CharacterMaintenanceStatus;
  proposedChangeCount: number;
  reason?:
    | "disabled"
    | "interval"
    | "pending-approval"
    | "character-not-found"
    | "error";
}

export const getCharacterMaintenanceServiceInstance = createInstanceCache(
  (chatId: string) => new CharacterMaintenanceService(chatId),
);

export class CharacterMaintenanceService {
  private readonly chatId: string;
  private inFlight?: Promise<CharacterMaintenanceResult>;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  maybeCreateProposalAfterSavedUserTurn(): Promise<CharacterMaintenanceResult> {
    return this.runExclusive(async () => {
      const settingsService = d.ChatSettingsService(this.chatId);
      const settings = await settingsService.Get();
      const characterSettings = getCharacterSheetSettings(settings);
      if (!characterSettings.autoSyncEnabled) {
        return skipped("disabled");
      }
      if (await this.hasPendingProposal()) {
        return skipped("pending-approval");
      }

      const nextCount = characterSettings.messagesSinceLastSync + 1;
      if (nextCount < characterSettings.syncInterval) {
        await settingsService.update({
          characterSheetsMessagesSinceLastSync: nextCount,
        });
        return skipped("interval");
      }

      await settingsService.update({
        characterSheetsMessagesSinceLastSync: 0,
      });
      return this.createAutomaticProposalSafely();
    });
  }

  synchronizeNow(): Promise<CharacterMaintenanceResult> {
    return this.runExclusive(async () => {
      if (await this.hasPendingProposal()) {
        return skipped("pending-approval");
      }

      await d.ChatSettingsService(this.chatId).update({
        characterSheetsMessagesSinceLastSync: 0,
      });
      return this.createAutomaticProposalSafely();
    });
  }

  generateOrUpdateCharacter(
    characterId: string,
  ): Promise<CharacterMaintenanceResult> {
    return this.runExclusive(async () => {
      if (await this.hasPendingProposal()) {
        return skipped("pending-approval");
      }

      try {
        await d.CharacterDescriptionsService(this.chatId).savePendingChanges();
        const characters = await d
          .CharacterDescriptionsService(this.chatId)
          .get();
        const character = characters.find(
          (candidate) => candidate.id === characterId,
        );
        if (!character) return skipped("character-not-found");

        const updates = await d
          .CharacterSheetSyncService(this.chatId)
          .synchronize([character]);
        const changes = buildSheetChanges([character], updates);
        return this.saveProposal("manual", changes);
      } catch (error) {
        d.ErrorService().log("Failed to prepare Character Sheet update", error);
        return failed();
      }
    });
  }

  private async createAutomaticProposalSafely(): Promise<CharacterMaintenanceResult> {
    try {
      const characters = await d
        .CharacterDescriptionsService(this.chatId)
        .get();
      const selection = await d
        .ActiveCharacterSelectionService(this.chatId)
        .select(characters);
      const proposedCharacters = applyActiveSelection(characters, selection);
      const activeCharacters = proposedCharacters.filter(isCharacterActive);
      const sheetUpdates = await d
        .CharacterSheetSyncService(this.chatId)
        .synchronize(activeCharacters);
      const changes = buildAutomaticChanges(
        characters,
        proposedCharacters,
        sheetUpdates,
      );
      return this.saveProposal("automatic", changes);
    } catch (error) {
      d.ErrorService().log(
        "Failed to prepare automatic character updates",
        error,
      );
      return failed();
    }
  }

  private async saveProposal(
    source: CharacterUpdateProposalSource,
    changes: CharacterUpdateChange[],
  ): Promise<CharacterMaintenanceResult> {
    if (changes.length === 0) {
      return { status: "unchanged", proposedChangeCount: 0 };
    }

    await d
      .CharacterUpdateProposalService(this.chatId)
      .save(createCharacterUpdateProposal(source, changes));
    return {
      status: "proposal-created",
      proposedChangeCount: changes.length,
    };
  }

  private async hasPendingProposal(): Promise<boolean> {
    const proposal = await d.CharacterUpdateProposalService(this.chatId).get();
    return proposal !== undefined;
  }

  private runExclusive(
    operation: () => Promise<CharacterMaintenanceResult>,
  ): Promise<CharacterMaintenanceResult> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = operation().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }
}

const applyActiveSelection = (
  characters: CharacterDescription[],
  selection: ActiveCharacterSelection,
): CharacterDescription[] => {
  const activeIds = new Set(selection.existingCharacterIds);
  const existingCharacters = characters.map((character) => ({
    ...character,
    detectedActive: activeIds.has(character.id),
  }));
  const newCharacters = selection.newCharacterNames.map((name) =>
    createCharacterDescription(name, ""),
  );

  return [...existingCharacters, ...newCharacters];
};

const buildAutomaticChanges = (
  currentCharacters: CharacterDescription[],
  proposedCharacters: CharacterDescription[],
  sheetUpdates: CharacterSheetUpdate[],
): CharacterUpdateChange[] => {
  const updatesById = new Map(
    sheetUpdates.map((update) => [update.characterId, update.sheetItems]),
  );

  return proposedCharacters.flatMap((proposed): CharacterUpdateChange[] => {
    const current = currentCharacters.find(
      (character) => character.id === proposed.id,
    );
    if (!current) {
      return [
        {
          characterId: proposed.id,
          characterName: proposed.name,
          isNew: true,
          previousSheetItems: [],
          proposedSheetItems: updatesById.get(proposed.id) ?? [],
          proposedDetectedActive: true,
        },
      ];
    }

    const proposedSheetItems = updatesById.get(current.id);
    const activityChanged = current.detectedActive !== proposed.detectedActive;
    const sheetChanged =
      proposedSheetItems !== undefined &&
      !areSheetItemsEqual(current.sheetItems, proposedSheetItems);
    if (!activityChanged && !sheetChanged) return [];

    return [
      {
        characterId: current.id,
        characterName: current.name,
        baseUpdatedAt: current.updatedAt,
        isNew: false,
        previousSheetItems: current.sheetItems,
        proposedSheetItems: sheetChanged ? proposedSheetItems : undefined,
        previousDetectedActive: current.detectedActive,
        proposedDetectedActive: activityChanged
          ? proposed.detectedActive
          : undefined,
      },
    ];
  });
};

const buildSheetChanges = (
  characters: CharacterDescription[],
  updates: CharacterSheetUpdate[],
): CharacterUpdateChange[] =>
  updates.flatMap((update) => {
    const character = characters.find(
      (candidate) => candidate.id === update.characterId,
    );
    if (
      !character ||
      areSheetItemsEqual(character.sheetItems, update.sheetItems)
    ) {
      return [];
    }

    return [
      {
        characterId: character.id,
        characterName: character.name,
        baseUpdatedAt: character.updatedAt,
        isNew: false,
        previousSheetItems: character.sheetItems,
        proposedSheetItems: update.sheetItems,
      },
    ];
  });

const areSheetItemsEqual = (
  firstItems: string[],
  secondItems: string[],
): boolean =>
  firstItems.length === secondItems.length &&
  firstItems.every((item, index) => item === secondItems[index]);

const skipped = (
  reason: NonNullable<CharacterMaintenanceResult["reason"]>,
): CharacterMaintenanceResult => ({
  status: "skipped",
  proposedChangeCount: 0,
  reason,
});

const failed = (): CharacterMaintenanceResult => ({
  status: "failed",
  proposedChangeCount: 0,
  reason: "error",
});
