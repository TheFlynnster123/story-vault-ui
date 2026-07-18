import { describe, expect, it } from "vitest";
import {
  getCharacterSheetSettings,
  normalizeCharacterSheetSyncInterval,
  normalizeCharacterSheetTrailingMessageCount,
} from "./CharacterSheetSettings";

describe("CharacterSheetSettings", () => {
  it("keeps automatic synchronization off for chats without canonical settings", () => {
    expect(getCharacterSheetSettings(undefined)).toEqual({
      autoSyncEnabled: false,
      syncInterval: 3,
      messagesSinceLastSync: 0,
      trailingMessageCount: 5,
    });
  });

  it("reads legacy cadence values without reviving the legacy enabled flag", () => {
    expect(
      getCharacterSheetSettings({
        timestampCreatedUtcMs: 0,
        chatTitle: "Test chat",
        prompt: "",
        characterSheetsAutoGenerateEnabled: true,
        characterSheetsCheckInterval: 9,
        characterSheetsMessagesSinceLastCheck: 4,
      }),
    ).toMatchObject({
      autoSyncEnabled: false,
      syncInterval: 9,
      messagesSinceLastSync: 4,
    });
  });

  it("rounds and clamps numeric settings", () => {
    expect(normalizeCharacterSheetSyncInterval("4.6")).toBe(5);
    expect(normalizeCharacterSheetSyncInterval(0)).toBe(1);
    expect(normalizeCharacterSheetSyncInterval(101)).toBe(100);
    expect(normalizeCharacterSheetTrailingMessageCount(-1)).toBe(0);
    expect(normalizeCharacterSheetTrailingMessageCount(51)).toBe(50);
    expect(normalizeCharacterSheetTrailingMessageCount("invalid")).toBe(5);
  });
});
