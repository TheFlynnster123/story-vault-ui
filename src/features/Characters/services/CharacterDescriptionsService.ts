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

  createBlankCharacter = async (
    name: string,
  ): Promise<CharacterDescription> => {
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
): CharacterDescription | undefined => {
  const exactMatch = descriptions.find((d) => isExactNameMatch(d.name, name));
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatches = findHighConfidenceFuzzyMatches(descriptions, name);

  if (fuzzyMatches.length === 0) {
    return undefined;
  }

  if (isAmbiguousTopMatch(fuzzyMatches)) {
    return undefined;
  }

  return fuzzyMatches[0].character;
};

const findCharacterById = (
  descriptions: CharacterDescription[],
  id: string,
): CharacterDescription | undefined => descriptions.find((d) => d.id === id);

const findCharacterIndexById = (
  descriptions: CharacterDescription[],
  id: string,
): number => descriptions.findIndex((d) => d.id === id);

const isExactNameMatch = (name1: string, name2: string): boolean =>
  normalizeForMatching(name1) === normalizeForMatching(name2);

const normalizeForMatching = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const tokenizeName = (name: string): string[] =>
  normalizeForMatching(name)
    .split(" ")
    .filter((token) => token.length > 0);

const findHighConfidenceFuzzyMatches = (
  descriptions: CharacterDescription[],
  name: string,
): ScoredCharacterMatch[] =>
  descriptions
    .map((character) => ({
      character,
      confidence: getNameMatchConfidence(name, character.name),
    }))
    .filter((match) => match.confidence >= HIGH_CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);

const getNameMatchConfidence = (
  inputName: string,
  candidateName: string,
): number => {
  const normalizedInput = normalizeForMatching(inputName);
  const normalizedCandidate = normalizeForMatching(candidateName);

  if (!normalizedInput || !normalizedCandidate) {
    return 0;
  }

  if (normalizedInput === normalizedCandidate) {
    return 1;
  }

  const tokenConfidence = getTokenMatchConfidence(
    normalizedInput,
    normalizedCandidate,
  );
  const stringConfidence = getLevenshteinSimilarity(
    normalizedInput,
    normalizedCandidate,
  );

  return Math.max(tokenConfidence, stringConfidence);
};

const getTokenMatchConfidence = (
  inputName: string,
  candidateName: string,
): number => {
  const inputTokens = tokenizeName(inputName);
  const candidateTokens = tokenizeName(candidateName);

  if (inputTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const inputCoverage =
    countMatchingTokens(inputTokens, candidateTokens) / inputTokens.length;
  const candidateCoverage =
    countMatchingTokens(candidateTokens, inputTokens) / candidateTokens.length;

  if (inputCoverage === 1 && candidateCoverage === 1) {
    return 1;
  }

  if (inputCoverage === 1 && candidateCoverage >= 0.5) {
    return 0.94;
  }

  if (candidateCoverage === 1 && inputCoverage >= 0.5) {
    return 0.9;
  }

  if (inputCoverage >= 0.75 && candidateCoverage >= 0.75) {
    return 0.88;
  }

  return Math.min(inputCoverage, candidateCoverage) * 0.8;
};

const countMatchingTokens = (
  sourceTokens: string[],
  targetTokens: string[],
): number =>
  sourceTokens.filter((sourceToken) =>
    targetTokens.some((targetToken) =>
      areTokensHighConfidenceMatch(sourceToken, targetToken),
    ),
  ).length;

const areTokensHighConfidenceMatch = (
  tokenA: string,
  tokenB: string,
): boolean => {
  if (tokenA === tokenB) {
    return true;
  }

  if (
    tokenA.length < MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH ||
    tokenB.length < MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH
  ) {
    return false;
  }

  return tokenA.startsWith(tokenB) || tokenB.startsWith(tokenA);
};

const getLevenshteinSimilarity = (left: string, right: string): number => {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) {
    return 1;
  }

  const distance = getLevenshteinDistance(left, right);
  return 1 - distance / maxLength;
};

const getLevenshteinDistance = (left: string, right: string): number => {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let i = 0; i <= left.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= right.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
};

const isAmbiguousTopMatch = (matches: ScoredCharacterMatch[]): boolean => {
  if (matches.length < 2) {
    return false;
  }

  return matches[0].confidence - matches[1].confidence < AMBIGUITY_GAP;
};

interface ScoredCharacterMatch {
  character: CharacterDescription;
  confidence: number;
}

const HIGH_CONFIDENCE_THRESHOLD = 0.88;
const AMBIGUITY_GAP = 0.05;
const MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH = 3;

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
