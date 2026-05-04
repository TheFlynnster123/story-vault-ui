export type PreferredImage = { id: string; source: "system" | "variant" };

export interface CharacterDescription {
  id: string;
  name: string;
  description: string;
  preferredImage?: PreferredImage;
  createdAt: string;
  updatedAt: string;
}

export const createCharacterDescription = (
  name: string,
  description: string,
): CharacterDescription => ({
  id: crypto.randomUUID(),
  name,
  description,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateCharacterDescription = (
  character: CharacterDescription,
  updates: Partial<
    Pick<CharacterDescription, "name" | "description" | "preferredImage">
  >,
): CharacterDescription => ({
  ...character,
  ...updates,
  updatedAt: new Date().toISOString(),
});
