import type { ChatSettings } from "../../Chat/services/Chat/ChatSettings";

export const DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL = 3;
export const DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT = 5;

export interface CharacterSheetSettings {
  autoSyncEnabled: boolean;
  syncInterval: number;
  messagesSinceLastSync: number;
  trailingMessageCount: number;
}

export const getCharacterSheetSettings = (
  settings: ChatSettings | undefined,
): CharacterSheetSettings => ({
  autoSyncEnabled: settings?.characterSheetsAutoSyncEnabled ?? false,
  syncInterval: normalizeCharacterSheetSyncInterval(
    settings?.characterSheetsSyncInterval ??
      settings?.characterSheetsCheckInterval,
  ),
  messagesSinceLastSync: normalizeCharacterSheetMessageCount(
    settings?.characterSheetsMessagesSinceLastSync ??
      settings?.characterSheetsMessagesSinceLastCheck,
  ),
  trailingMessageCount: normalizeCharacterSheetTrailingMessageCount(
    settings?.characterSheetsTrailingMessageCount,
  ),
});

export const normalizeCharacterSheetSyncInterval = (
  value: number | string | undefined,
): number =>
  normalizeNumber(
    value,
    DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL,
    MIN_SYNC_INTERVAL,
    MAX_SYNC_INTERVAL,
  );

export const normalizeCharacterSheetMessageCount = (
  value: number | string | undefined,
): number => normalizeNumber(value, 0, 0, MAX_SYNC_INTERVAL - 1);

export const normalizeCharacterSheetTrailingMessageCount = (
  value: number | string | undefined,
): number =>
  normalizeNumber(
    value,
    DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
    MIN_TRAILING_MESSAGE_COUNT,
    MAX_TRAILING_MESSAGE_COUNT,
  );

const normalizeNumber = (
  value: number | string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export const MIN_SYNC_INTERVAL = 1;
export const MAX_SYNC_INTERVAL = 100;
export const MIN_TRAILING_MESSAGE_COUNT = 0;
export const MAX_TRAILING_MESSAGE_COUNT = 50;
