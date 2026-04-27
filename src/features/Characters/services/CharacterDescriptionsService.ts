import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "./CharacterDescription";
import {
  createCharacterDescription,
  updateCharacterDescription,
} from "./CharacterDescription";

export class CharacterDescriptionsService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = async (): Promise<CharacterDescription[]> => {
    const descriptions = await d
      .CharacterDescriptionsManagedBlob(this.chatId)
      .get();
    return descriptions ?? [];
  };

  save = async (descriptions: CharacterDescription[]): Promise<void> =>
    await d.CharacterDescriptionsManagedBlob(this.chatId).save(descriptions);

  saveDebounced = (descriptions: CharacterDescription[]): void =>
    d.CharacterDescriptionsManagedBlob(this.chatId).saveDebounced(descriptions);

  findByName = async (
    name: string,
  ): Promise<CharacterDescription | undefined> => {
    const descriptions = await this.get();
    return findCharacterByName(descriptions, name);
  };

  upsertDescription = async (
    description: CharacterDescription,
  ): Promise<void> => {
    const descriptions = await this.get();
    const existingIndex = findCharacterIndexById(descriptions, description.id);

    const updatedDescriptions = upsertCharacterInList(
      descriptions,
      description,
      existingIndex,
    );

    await this.save(updatedDescriptions);
  };

  removeDescription = async (id: string): Promise<void> => {
    const descriptions = await this.get();
    const filteredDescriptions = removeCharacterFromList(descriptions, id);
    await this.save(filteredDescriptions);
  };

  createBlankCharacter = async (name: string): Promise<CharacterDescription> => {
    const descriptions = await this.get();
    const existing = findCharacterByName(descriptions, name);

    if (existing) return existing;

    const newCharacter = createCharacterDescription(name, "");
    await this.upsertDescription(newCharacter);
    return newCharacter;
  };

  updateCharacter = async (
    id: string,
    updates: Partial<Pick<CharacterDescription, "name" | "description">>,
  ): Promise<void> => {
    const descriptions = await this.get();
    const character = findCharacterById(descriptions, id);

    if (!character) return;

    const updatedCharacter = updateCharacterDescription(character, updates);
    await this.upsertDescription(updatedCharacter);
  };

  subscribe = (callback: () => void): (() => void) =>
    d.CharacterDescriptionsManagedBlob(this.chatId).subscribe(callback);
}

const findCharacterByName = (
  descriptions: CharacterDescription[],
  name: string,
): CharacterDescription | undefined =>
  descriptions.find((d) => isNameMatch(d.name, name));

const findCharacterById = (
  descriptions: CharacterDescription[],
  id: string,
): CharacterDescription | undefined => descriptions.find((d) => d.id === id);

const findCharacterIndexById = (
  descriptions: CharacterDescription[],
  id: string,
): number => descriptions.findIndex((d) => d.id === id);

const isNameMatch = (name1: string, name2: string): boolean =>
  normalizeForMatching(name1) === normalizeForMatching(name2);

const normalizeForMatching = (name: string): string =>
  name.toLowerCase().trim();

const upsertCharacterInList = (
  descriptions: CharacterDescription[],
  character: CharacterDescription,
  existingIndex: number,
): CharacterDescription[] => {
  if (existingIndex >= 0) {
    return replaceCharacterAtIndex(descriptions, character, existingIndex);
  }
  return addCharacterToList(descriptions, character);
};

const replaceCharacterAtIndex = (
  descriptions: CharacterDescription[],
  character: CharacterDescription,
  index: number,
): CharacterDescription[] => [
  ...descriptions.slice(0, index),
  character,
  ...descriptions.slice(index + 1),
];

const addCharacterToList = (
  descriptions: CharacterDescription[],
  character: CharacterDescription,
): CharacterDescription[] => [...descriptions, character];

const removeCharacterFromList = (
  descriptions: CharacterDescription[],
  id: string,
): CharacterDescription[] => descriptions.filter((d) => d.id !== id);
