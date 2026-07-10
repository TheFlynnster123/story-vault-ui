export type PreferredImage = { id: string; source: "system" | "variant" };

/** Current character record schema (v2). */
export interface CharacterDescription {
  id: string;
  name: string;
  /** Stable, image-focused physical traits. */
  appearance: string;
  /** Durable narrative continuity for text generation. */
  sheet?: string;
  sheetSource?: "auto" | "manual";
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

/** Persisted before Character Appearance replaced Character Description. */
export interface LegacyCharacterDescription {
  id: string;
  name: string;
  description: string;
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

export type PersistedCharacterDescription =
  | CharacterDescription
  | LegacyCharacterDescription;

export const CHARACTER_SCHEMA_VERSION = 2;

export const createCharacterDescription = (
  name: string,
  appearance: string,
): CharacterDescription => ({
  id: crypto.randomUUID(),
  name,
  appearance,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateCharacterDescription = (
  character: CharacterDescription,
  updates: Partial<
    Pick<
      CharacterDescription,
      "name" | "appearance" | "sheet" | "sheetSource" | "preferredImage"
    >
  >,
): CharacterDescription => ({
  ...character,
  ...updates,
  updatedAt: new Date().toISOString(),
});

export const getCharacterAppearance = (
  character: Partial<CharacterDescription & LegacyCharacterDescription>,
): string => character.appearance ?? character.description ?? "";

export const migrateCharacterDescriptions = (
  characters: PersistedCharacterDescription[],
): CharacterDescription[] =>
  characters.map((character) => {
    const current = { ...character } as Partial<
      CharacterDescription & LegacyCharacterDescription
    >;
    delete current.description;

    return {
      ...current,
      appearance: getCharacterAppearance(character),
    } as CharacterDescription;
  });
