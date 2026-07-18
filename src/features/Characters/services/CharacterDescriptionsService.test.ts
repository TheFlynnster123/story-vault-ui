import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "./CharacterDescription";
import { CharacterDescriptionsService } from "./CharacterDescriptionsService";
import type { CharacterUpdateProposal } from "./CharacterUpdateProposal";

vi.mock("../../../services/Dependencies");

describe("CharacterDescriptionsService", () => {
  const chatId = "chat-1";
  const blob = {
    get: vi.fn(),
    save: vi.fn(),
    saveDebounced: vi.fn(),
    savePendingChanges: vi.fn(),
    subscribe: vi.fn(),
  };
  const settings = {
    Get: vi.fn(),
    update: vi.fn(),
  };
  let service: CharacterDescriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    blob.get.mockResolvedValue([]);
    settings.Get.mockResolvedValue({ charactersSchemaVersion: 3 });
    vi.mocked(d.CharacterDescriptionsManagedBlob).mockReturnValue(
      blob as never,
    );
    vi.mocked(d.ChatSettingsService).mockReturnValue(settings as never);
    service = new CharacterDescriptionsService(chatId);
  });

  it("reads schema-v3 characters without rewriting them", async () => {
    const characters = [createCharacter()];
    blob.get.mockResolvedValue(characters);

    await expect(service.get()).resolves.toEqual(characters);
    expect(blob.save).not.toHaveBeenCalled();
    expect(settings.update).not.toHaveBeenCalled();
  });

  it("migrates legacy appearance and bullet sheets before advancing schema", async () => {
    blob.get.mockResolvedValue([
      {
        id: "mara",
        name: "Mara",
        description: "Short black curls",
        sheet: "- Navigator\n- Carries the brass key",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ]);
    settings.Get.mockResolvedValue({
      charactersSchemaVersion: 1,
      characterSheetsAutoGenerateEnabled: true,
      characterSheetsCheckInterval: 7,
    });

    const result = await service.get();

    expect(result[0]).toMatchObject({
      appearance: "Short black curls",
      sheetItems: ["Navigator", "Carries the brass key"],
      detectedActive: true,
    });
    expect(blob.save).toHaveBeenCalledWith(result);
    expect(blob.save.mock.invocationCallOrder[0]).toBeLessThan(
      settings.update.mock.invocationCallOrder[0],
    );
    expect(settings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        charactersSchemaVersion: 3,
        characterSheetsAutoSyncEnabled: false,
        characterSheetsSyncInterval: 7,
        characterSheetsMessagesSinceLastSync: 0,
      }),
    );
  });

  it("preserves legacy prose as one sheet item", async () => {
    blob.get.mockResolvedValue([
      {
        ...createCharacter(),
        sheetItems: undefined,
        sheet: "Keeps watch over the northern road.\nNever trusts Ivo.",
      },
    ]);

    const result = await service.get();

    expect(result[0].sheetItems).toEqual([
      "Keeps watch over the northern road.\nNever trusts Ivo.",
    ]);
  });

  it("finds unambiguous character aliases but rejects ambiguous ones", async () => {
    blob.get.mockResolvedValue([
      createCharacter({ name: "Sarah Chen", id: "sarah-chen" }),
      createCharacter({ name: "Mara Venn", id: "mara" }),
    ]);
    await expect(service.findByName("Sarah")).resolves.toMatchObject({
      id: "sarah-chen",
    });

    blob.get.mockResolvedValue([
      createCharacter({ name: "Sarah Chen", id: "sarah-chen" }),
      createCharacter({ name: "Sarah Connor", id: "sarah-connor" }),
    ]);
    await expect(service.findByName("Sarah")).resolves.toBeUndefined();
  });

  it("creates, updates, removes, and debounces characters", async () => {
    const mara = createCharacter();
    blob.get.mockResolvedValueOnce([]).mockResolvedValueOnce([mara]);

    const created = await service.createBlankCharacter("Ivo");
    expect(created).toMatchObject({
      name: "Ivo",
      sheetItems: [],
      detectedActive: true,
    });
    expect(blob.save).toHaveBeenCalledWith([created]);

    await service.updateCharacter(mara.id, {
      sheetItems: ["  New clue  ", "New clue"],
      sheetSource: "manual",
    });
    expect(blob.save).toHaveBeenLastCalledWith([
      expect.objectContaining({
        sheetItems: ["New clue"],
        sheetSource: "manual",
      }),
    ]);

    blob.get.mockResolvedValue([mara]);
    await service.removeDescription(mara.id);
    expect(blob.save).toHaveBeenLastCalledWith([]);

    service.saveDebounced([mara]);
    expect(blob.saveDebounced).toHaveBeenCalledWith([mara]);
  });

  it("applies an approved proposal while preserving the user activity override", async () => {
    const mara = createCharacter({ activeOverride: false });
    blob.get.mockResolvedValue([mara]);

    const result = await service.applyUpdateProposal(
      createProposal(mara, {
        proposedSheetItems: ["Knows the passphrase"],
        proposedDetectedActive: false,
      }),
    );

    expect(result).toEqual({ status: "applied" });
    expect(blob.save).toHaveBeenCalledWith([
      expect.objectContaining({
        sheetItems: ["Knows the passphrase"],
        sheetSource: "auto",
        detectedActive: false,
        activeOverride: false,
      }),
    ]);
  });

  it("rejects a stale proposal without saving partial changes", async () => {
    const mara = createCharacter({ updatedAt: "newer" });
    blob.get.mockResolvedValue([mara]);

    const result = await service.applyUpdateProposal(
      createProposal(mara, {
        baseUpdatedAt: "older",
        proposedSheetItems: ["Stale"],
      }),
    );

    expect(result).toEqual({
      status: "conflict",
      characterNames: ["Mara"],
    });
    expect(blob.save).not.toHaveBeenCalled();
  });

  it("rejects a proposed new character when its name now exists", async () => {
    const mara = createCharacter();
    blob.get.mockResolvedValue([mara]);
    const proposal: CharacterUpdateProposal = {
      id: "proposal",
      source: "automatic",
      createdAt: "2026-01-01",
      changes: [
        {
          characterId: "new-id",
          characterName: "Mara",
          isNew: true,
          previousSheetItems: [],
          proposedSheetItems: ["Duplicate"],
        },
      ],
    };

    await expect(service.applyUpdateProposal(proposal)).resolves.toEqual({
      status: "conflict",
      characterNames: ["Mara"],
    });
    expect(blob.save).not.toHaveBeenCalled();
  });
});

const createCharacter = (
  overrides: Partial<CharacterDescription> = {},
): CharacterDescription => ({
  id: "mara",
  name: "Mara",
  appearance: "Short black curls",
  sheetItems: ["Navigator"],
  detectedActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const createProposal = (
  character: CharacterDescription,
  changeOverrides: Partial<CharacterUpdateProposal["changes"][number]>,
): CharacterUpdateProposal => ({
  id: "proposal",
  source: "automatic",
  createdAt: "2026-01-02",
  changes: [
    {
      characterId: character.id,
      characterName: character.name,
      baseUpdatedAt: character.updatedAt,
      isNew: false,
      previousSheetItems: character.sheetItems,
      ...changeOverrides,
    },
  ],
});
