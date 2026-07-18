export type PreferredImage = { id: string; source: "system" | "variant" };

export interface CharacterDescription {
  id: string;
  name: string;
  appearance: string;
  sheetItems: string[];
  sheetSource?: "auto" | "manual";
  detectedActive: boolean;
  activeOverride?: boolean;
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterDescriptionV2 {
  id: string;
  name: string;
  appearance: string;
  sheet?: string;
  sheetSource?: "auto" | "manual";
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyCharacterDescription {
  id: string;
  name: string;
  description: string;
  sheet?: string;
  sheetSource?: "auto" | "manual";
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

export type PersistedCharacterDescription =
  CharacterDescription | CharacterDescriptionV2 | LegacyCharacterDescription;

export const CHARACTER_SCHEMA_VERSION = 3;

export const createCharacterDescription = (
  name: string,
  appearance: string,
): CharacterDescription => {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    appearance,
    sheetItems: [],
    detectedActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export type CharacterDescriptionUpdate = Partial<
  Pick<
    CharacterDescription,
    | "name"
    | "appearance"
    | "sheetItems"
    | "sheetSource"
    | "detectedActive"
    | "activeOverride"
    | "preferredImage"
  >
>;

export const updateCharacterDescription = (
  character: CharacterDescription,
  updates: CharacterDescriptionUpdate,
): CharacterDescription => ({
  ...character,
  ...updates,
  sheetItems:
    updates.sheetItems === undefined
      ? character.sheetItems
      : [...updates.sheetItems],
  updatedAt: new Date().toISOString(),
});

export const isCharacterActive = (
  character: Pick<CharacterDescription, "activeOverride" | "detectedActive">,
): boolean => character.activeOverride ?? character.detectedActive;

export const getCharacterAppearance = (
  character: Partial<CharacterDescription & LegacyCharacterDescription>,
): string => character.appearance ?? character.description ?? "";

export const normalizeSheetItems = (items: readonly string[]): string[] => {
  const normalizedItems = items.map((item) => item.trim()).filter(Boolean);
  return [...new Set(normalizedItems)];
};

export const migrateCharacterDescriptions = (
  characters: PersistedCharacterDescription[],
): CharacterDescription[] => characters.map(migrateCharacterDescription);

export const needsCharacterDataMigration = (
  characters: PersistedCharacterDescription[],
): boolean =>
  characters.some(
    (character) =>
      !("sheetItems" in character) ||
      !Array.isArray(character.sheetItems) ||
      !("detectedActive" in character) ||
      typeof character.detectedActive !== "boolean" ||
      "description" in character ||
      "sheet" in character,
  );

const migrateCharacterDescription = (
  character: PersistedCharacterDescription,
): CharacterDescription => {
  const persisted = character as Partial<
    CharacterDescription & CharacterDescriptionV2 & LegacyCharacterDescription
  >;

  return {
    id: character.id,
    name: character.name,
    appearance: getCharacterAppearance(persisted),
    sheetItems: getPersistedSheetItems(persisted),
    sheetSource: persisted.sheetSource,
    detectedActive:
      typeof persisted.detectedActive === "boolean"
        ? persisted.detectedActive
        : true,
    activeOverride: persisted.activeOverride,
    preferredImage: persisted.preferredImage,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
};

const getPersistedSheetItems = (
  character: Partial<CharacterDescription & CharacterDescriptionV2>,
): string[] => {
  if (Array.isArray(character.sheetItems)) {
    return normalizeSheetItems(character.sheetItems);
  }

  return parseLegacySheet(character.sheet ?? "");
};

const parseLegacySheet = (sheet: string): string[] => {
  const trimmedSheet = sheet.trim();
  if (!trimmedSheet) return [];

  const lines = trimmedSheet
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletItems = lines.map(extractBulletItem);

  if (bulletItems.every((item): item is string => item !== undefined)) {
    return normalizeSheetItems(bulletItems);
  }

  return [trimmedSheet];
};

const extractBulletItem = (line: string): string | undefined => {
  const match = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
  return match?.[1]?.trim() || undefined;
};
