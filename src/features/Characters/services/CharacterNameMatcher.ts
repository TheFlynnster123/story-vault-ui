import type { CharacterDescription } from "./CharacterDescription";

export const findCharacterByName = (
  characters: CharacterDescription[],
  name: string,
): CharacterDescription | undefined => {
  const exactMatch = characters.find((character) =>
    isExactCharacterNameMatch(character.name, name),
  );
  if (exactMatch) return exactMatch;

  const fuzzyMatches = findHighConfidenceFuzzyMatches(characters, name);
  if (fuzzyMatches.length === 0 || isAmbiguousTopMatch(fuzzyMatches)) {
    return undefined;
  }

  return fuzzyMatches[0].character;
};

export const normalizeCharacterName = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

export const isExactCharacterNameMatch = (
  firstName: string,
  secondName: string,
): boolean =>
  normalizeCharacterName(firstName) === normalizeCharacterName(secondName);

const findHighConfidenceFuzzyMatches = (
  characters: CharacterDescription[],
  name: string,
): ScoredCharacterMatch[] =>
  characters
    .map((character) => ({
      character,
      confidence: getNameMatchConfidence(name, character.name),
    }))
    .filter((match) => match.confidence >= HIGH_CONFIDENCE_THRESHOLD)
    .sort((first, second) => second.confidence - first.confidence);

const getNameMatchConfidence = (
  inputName: string,
  candidateName: string,
): number => {
  const normalizedInput = normalizeCharacterName(inputName);
  const normalizedCandidate = normalizeCharacterName(candidateName);
  if (!normalizedInput || !normalizedCandidate) return 0;
  if (normalizedInput === normalizedCandidate) return 1;

  return Math.max(
    getTokenMatchConfidence(normalizedInput, normalizedCandidate),
    getLevenshteinSimilarity(normalizedInput, normalizedCandidate),
  );
};

const getTokenMatchConfidence = (
  inputName: string,
  candidateName: string,
): number => {
  const inputTokens = tokenizeName(inputName);
  const candidateTokens = tokenizeName(candidateName);
  if (inputTokens.length === 0 || candidateTokens.length === 0) return 0;

  const inputCoverage =
    countMatchingTokens(inputTokens, candidateTokens) / inputTokens.length;
  const candidateCoverage =
    countMatchingTokens(candidateTokens, inputTokens) / candidateTokens.length;

  if (inputCoverage === 1 && candidateCoverage === 1) return 1;
  if (inputCoverage === 1 && candidateCoverage >= 0.5) return 0.94;
  if (candidateCoverage === 1 && inputCoverage >= 0.5) return 0.9;
  if (inputCoverage >= 0.75 && candidateCoverage >= 0.75) return 0.88;

  return Math.min(inputCoverage, candidateCoverage) * 0.8;
};

const tokenizeName = (name: string): string[] =>
  normalizeCharacterName(name).split(" ").filter(Boolean);

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
  firstToken: string,
  secondToken: string,
): boolean => {
  if (firstToken === secondToken) return true;
  if (
    firstToken.length < MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH ||
    secondToken.length < MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH
  ) {
    return false;
  }

  return (
    firstToken.startsWith(secondToken) || secondToken.startsWith(firstToken)
  );
};

const getLevenshteinSimilarity = (left: string, right: string): number => {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;
  return 1 - getLevenshteinDistance(left, right) / maxLength;
};

const getLevenshteinDistance = (left: string, right: string): number => {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
};

const isAmbiguousTopMatch = (matches: ScoredCharacterMatch[]): boolean =>
  matches.length > 1 &&
  matches[0].confidence - matches[1].confidence < AMBIGUITY_GAP;

interface ScoredCharacterMatch {
  character: CharacterDescription;
  confidence: number;
}

const HIGH_CONFIDENCE_THRESHOLD = 0.88;
const AMBIGUITY_GAP = 0.05;
const MIN_TOKEN_LENGTH_FOR_PREFIX_MATCH = 3;
