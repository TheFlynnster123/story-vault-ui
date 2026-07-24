import { d } from "../../../services/Dependencies";
import type {
  CharacterDescription,
  CharacterDescriptionUpdate,
  PersistedCharacterDescription,
} from "./CharacterDescription";
import {
  CHARACTER_SCHEMA_VERSION,
  createCharacterDescription,
  isCharacterTracked,
  migrateCharacterDescriptions,
  needsCharacterDataMigration,
  normalizeSheetItems,
  updateCharacterDescription,
} from "./CharacterDescription";
import { findCharacterByName } from "./CharacterNameMatcher";
import {
  DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL,
  getCharacterSheetSettings,
} from "./CharacterSheetSettings";
import type { CharacterUpdateProposal } from "./CharacterUpdateProposal";
import type { CharacterProposalApprovalResult } from "./CharacterUpdateProposalService";

export class CharacterDescriptionsService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = async (): Promise<CharacterDescription[]> => {
    const persistedCharacters =
      (await d.CharacterDescriptionsManagedBlob(this.chatId).get()) ?? [];
    return this.migrateIfNeeded(persistedCharacters);
  };

  save = async (characters: CharacterDescription[]): Promise<void> =>
    d.CharacterDescriptionsManagedBlob(this.chatId).save(characters);

  saveDebounced = (characters: CharacterDescription[]): void =>
    d.CharacterDescriptionsManagedBlob(this.chatId).saveDebounced(characters);

  savePendingChanges = (): Promise<void> =>
    d.CharacterDescriptionsManagedBlob(this.chatId).savePendingChanges();

  findByName = async (
    name: string,
  ): Promise<CharacterDescription | undefined> =>
    findCharacterByName(await this.get(), name);

  upsertDescription = async (
    character: CharacterDescription,
  ): Promise<void> => {
    const characters = await this.get();
    await this.save(upsertCharacter(characters, character));
  };

  removeDescription = async (id: string): Promise<void> => {
    const characters = await this.get();
    await this.save(characters.filter((character) => character.id !== id));
  };

  createBlankCharacter = async (
    name: string,
  ): Promise<CharacterDescription> => {
    const characters = await this.get();
    const existing = findCharacterByName(characters, name);
    if (existing) return existing;

    const character = createCharacterDescription(name, "");
    await this.save([...characters, character]);
    return character;
  };

  updateCharacter = async (
    id: string,
    updates: CharacterDescriptionUpdate,
  ): Promise<void> => {
    const characters = await this.get();
    const character = characters.find((candidate) => candidate.id === id);
    if (!character) return;

    const normalizedUpdates =
      updates.sheetItems === undefined
        ? updates
        : { ...updates, sheetItems: normalizeSheetItems(updates.sheetItems) };

    await this.save(
      upsertCharacter(
        characters,
        updateCharacterDescription(character, normalizedUpdates),
      ),
    );
  };

  setActivityOverride = (
    id: string,
    activeOverride: boolean | undefined,
  ): Promise<void> => this.updateCharacter(id, { activeOverride });

  applyUpdateProposal = async (
    proposal: CharacterUpdateProposal,
  ): Promise<CharacterProposalApprovalResult> => {
    const characters = await this.get();
    const conflictingNames = findProposalConflicts(characters, proposal);
    if (conflictingNames.length > 0) {
      return { status: "conflict", characterNames: conflictingNames };
    }

    await this.save(applyProposalChanges(characters, proposal));
    return { status: "applied" };
  };

  subscribe = (callback: () => void): (() => void) =>
    d.CharacterDescriptionsManagedBlob(this.chatId).subscribe(callback);

  private migrateIfNeeded = async (
    persistedCharacters: PersistedCharacterDescription[],
  ): Promise<CharacterDescription[]> => {
    const characters = migrateCharacterDescriptions(persistedCharacters);
    const settings = await d.ChatSettingsService(this.chatId).Get();
    const currentVersion = settings?.charactersSchemaVersion ?? 1;
    const needsDataMigration = needsCharacterDataMigration(persistedCharacters);

    if (currentVersion >= CHARACTER_SCHEMA_VERSION && !needsDataMigration) {
      return characters;
    }

    if (needsDataMigration) {
      await this.save(characters);
    }

    if (settings) {
      const legacySettings = getCharacterSheetSettings(settings);
      await d.ChatSettingsService(this.chatId).update({
        charactersSchemaVersion: CHARACTER_SCHEMA_VERSION,
        characterSheetsAutoSyncEnabled:
          settings.characterSheetsAutoSyncEnabled ?? false,
        characterSheetsSyncInterval:
          settings.characterSheetsSyncInterval ??
          legacySettings.syncInterval ??
          DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL,
        characterSheetsMessagesSinceLastSync: 0,
        characterSheetsAutoGenerateEnabled: undefined,
        characterSheetsCheckInterval: undefined,
        characterSheetsMessagesSinceLastCheck: undefined,
      });
    }

    return characters;
  };
}

const upsertCharacter = (
  characters: CharacterDescription[],
  character: CharacterDescription,
): CharacterDescription[] => {
  const existingIndex = characters.findIndex(
    (candidate) => candidate.id === character.id,
  );
  if (existingIndex < 0) return [...characters, character];

  return [
    ...characters.slice(0, existingIndex),
    character,
    ...characters.slice(existingIndex + 1),
  ];
};

const findProposalConflicts = (
  characters: CharacterDescription[],
  proposal: CharacterUpdateProposal,
): string[] =>
  proposal.changes.flatMap((change) => {
    const current = characters.find(
      (character) => character.id === change.characterId,
    );

    if (change.isNew) {
      return current || findCharacterByName(characters, change.characterName)
        ? [change.characterName]
        : [];
    }

    return !current ||
      !isCharacterTracked(current) ||
      current.updatedAt !== change.baseUpdatedAt
      ? [change.characterName]
      : [];
  });

const applyProposalChanges = (
  characters: CharacterDescription[],
  proposal: CharacterUpdateProposal,
): CharacterDescription[] =>
  proposal.changes.reduce((currentCharacters, change) => {
    if (change.isNew) {
      return [
        ...currentCharacters,
        createProposedCharacter(change, proposal.createdAt),
      ];
    }

    const current = currentCharacters.find(
      (character) => character.id === change.characterId,
    );
    if (!current) return currentCharacters;

    const updated = updateCharacterDescription(current, {
      sheetItems: change.proposedSheetItems,
      sheetSource:
        change.proposedSheetItems === undefined ? current.sheetSource : "auto",
      detectedActive: change.proposedDetectedActive ?? current.detectedActive,
    });
    return upsertCharacter(currentCharacters, updated);
  }, characters);

const createProposedCharacter = (
  change: CharacterUpdateProposal["changes"][number],
  createdAt: string,
): CharacterDescription => ({
  id: change.characterId,
  name: change.characterName,
  appearance: "",
  sheetItems: change.proposedSheetItems ?? [],
  sheetSource: change.proposedSheetItems === undefined ? undefined : "auto",
  isTracked: true,
  autoAcceptChanges: false,
  detectedActive: change.proposedDetectedActive ?? true,
  createdAt,
  updatedAt: createdAt,
});
