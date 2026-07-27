import { describe, expect, it } from "vitest";
import {
  createContinuityHistory,
  createDefaultContinuityHistoryStore,
  DEFAULT_HISTORY_CONTEXT_TRAILING_MESSAGES,
  DEFAULT_HISTORY_REFRESH_INTERVAL,
  normalizeContinuityHistoryStore,
  normalizeRoutingHints,
} from "./ContinuityHistory";

describe("ContinuityHistory", () => {
  it("keeps the feature disabled by default without removing discovery controls", () => {
    const store = createDefaultContinuityHistoryStore();

    expect(store.settings.enabled).toBe(false);
    expect(store.settings.autoDiscover).toBe(true);
    expect(store.settings.useLlmSelection).toBe(true);
    expect(store.settings.refreshInterval).toBe(
      DEFAULT_HISTORY_REFRESH_INTERVAL,
    );
    expect(store.settings.contextTrailingMessages).toBe(
      DEFAULT_HISTORY_CONTEXT_TRAILING_MESSAGES,
    );
  });

  it("normalizes unsafe persisted settings and fills new fields", () => {
    const store = normalizeContinuityHistoryStore({
      schemaVersion: 1,
      settings: {
        ...createDefaultContinuityHistoryStore().settings,
        refreshInterval: 0,
        refreshLookbackMessages: 999,
        selectionLookbackMessages: Number.NaN,
        contextTrailingMessages: -10,
        maxSelectedHistories: 100,
        refreshPrompt: " ",
        selectionPrompt: " ",
      },
      histories: [],
    });

    expect(store.settings.refreshInterval).toBe(1);
    expect(store.settings.refreshLookbackMessages).toBe(200);
    expect(store.settings.selectionLookbackMessages).toBe(8);
    expect(store.settings.contextTrailingMessages).toBe(0);
    expect(store.settings.maxSelectedHistories).toBe(20);
    expect(store.settings.refreshPrompt.trim()).not.toBe("");
    expect(store.settings.selectionPrompt.trim()).not.toBe("");
  });

  it("creates a blank custom History with automatic inclusion", () => {
    const history = createContinuityHistory("The Brass Key");

    expect(history).toMatchObject({
      title: "The Brass Key",
      kind: "custom",
      inclusion: "automatic",
      revisions: [],
    });
    expect(history.id).not.toBe("");
  });

  it("trims and deduplicates routing hints", () => {
    expect(
      normalizeRoutingHints([" brass key ", "", "Mara", "brass key"]),
    ).toEqual(["brass key", "Mara"]);
  });
});
