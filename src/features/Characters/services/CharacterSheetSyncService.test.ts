import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "./CharacterDescription";
import { CharacterSheetSyncService } from "./CharacterSheetSyncService";

vi.mock("../../../services/Dependencies");

describe("CharacterSheetSyncService", () => {
  const contextService = {
    buildGenerationRequestMessages: vi.fn(),
  };
  const promptsService = { Get: vi.fn() };
  const api = { postStructuredChat: vi.fn() };
  const characters = [
    createCharacter("mara", "Mara", ["Navigator"]),
    createCharacter("ivo", "Ivo", []),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    contextService.buildGenerationRequestMessages.mockResolvedValue([
      { id: "1", role: "user", content: "Mara hands Ivo the key." },
    ]);
    promptsService.Get.mockResolvedValue(undefined);
    api.postStructuredChat.mockResolvedValue({
      characters: [
        { id: "mara", items: ["Navigator", "Gave Ivo the brass key"] },
        { id: "ivo", items: ["Carries the brass key"] },
      ],
    });
    vi.mocked(d.LLMMessageContextService).mockReturnValue(
      contextService as never,
    );
    vi.mocked(d.SystemPromptsService).mockReturnValue(promptsService as never);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(api as never);
  });

  it("returns a complete normalized replacement batch", async () => {
    const result = await new CharacterSheetSyncService("chat-1").synchronize(
      characters,
    );

    expect(result).toEqual([
      {
        characterId: "mara",
        sheetItems: ["Navigator", "Gave Ivo the brass key"],
      },
      { characterId: "ivo", sheetItems: ["Carries the brass key"] },
    ]);
    expect(contextService.buildGenerationRequestMessages).toHaveBeenCalledWith(
      false,
    );
    const payload = api.postStructuredChat.mock.calls[0][0].at(-1).content;
    expect(payload).toContain('"currentItems":["Navigator"]');
  });

  it("returns immediately for an empty requested cast", async () => {
    await expect(
      new CharacterSheetSyncService("chat-1").synchronize([]),
    ).resolves.toEqual([]);
    expect(api.postStructuredChat).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "missing character",
      response: { characters: [{ id: "mara", items: [] }] },
    },
    {
      label: "duplicate character",
      response: {
        characters: [
          { id: "mara", items: [] },
          { id: "mara", items: [] },
        ],
      },
    },
    {
      label: "unknown character",
      response: {
        characters: [
          { id: "mara", items: [] },
          { id: "unknown", items: [] },
        ],
      },
    },
  ])("rejects a $label batch", async ({ response }) => {
    api.postStructuredChat.mockResolvedValue(response);

    await expect(
      new CharacterSheetSyncService("chat-1").synchronize(characters),
    ).rejects.toThrow("every requested character exactly once");
  });

  it("rejects invalid or oversized sheet items", async () => {
    api.postStructuredChat.mockResolvedValue({
      characters: [
        { id: "mara", items: [""] },
        { id: "ivo", items: [] },
      ],
    });

    await expect(
      new CharacterSheetSyncService("chat-1").synchronize(characters),
    ).rejects.toThrow("invalid sheet item");
  });

  it("uses the dedicated configured prompt and model", async () => {
    promptsService.Get.mockResolvedValue({
      characterSheetUpdatePrompt: "Update continuity.",
      characterSheetUpdateModel: "model/sheets",
      characterSheetUpdateRequestSettings: { temperature: 0.1 },
    });

    await new CharacterSheetSyncService("chat-1").synchronize(characters);

    const call = api.postStructuredChat.mock.calls[0];
    expect(call[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "system",
          content: "Update continuity.",
        }),
      ]),
    );
    expect(call[2]).toBe("model/sheets");
    expect(call[3]).toBe("Character Sheet Sync");
    expect(call[5]).toEqual({ temperature: 0.1 });
  });
});

const createCharacter = (
  id: string,
  name: string,
  sheetItems: string[],
): CharacterDescription => ({
  id,
  name,
  appearance: "",
  sheetItems,
  detectedActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});
