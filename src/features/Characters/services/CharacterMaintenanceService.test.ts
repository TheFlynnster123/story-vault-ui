import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "./CharacterDescription";
import { CharacterMaintenanceService } from "./CharacterMaintenanceService";

vi.mock("../../../services/Dependencies");

describe("CharacterMaintenanceService", () => {
  const mara = createCharacter();
  const settings = {
    Get: vi.fn(),
    update: vi.fn(),
  };
  const proposals = {
    get: vi.fn(),
    save: vi.fn(),
    discard: vi.fn(),
  };
  const descriptions = {
    get: vi.fn(),
    savePendingChanges: vi.fn(),
    applyUpdateProposal: vi.fn(),
  };
  const activeSelection = { select: vi.fn() };
  const sheetSync = { synchronize: vi.fn() };
  const errorService = { log: vi.fn() };
  let service: CharacterMaintenanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    settings.Get.mockResolvedValue({
      characterSheetsAutoSyncEnabled: true,
      characterSheetsSyncInterval: 3,
      characterSheetsMessagesSinceLastSync: 0,
    });
    settings.update.mockResolvedValue(undefined);
    proposals.get.mockResolvedValue(undefined);
    proposals.save.mockResolvedValue(undefined);
    proposals.discard.mockResolvedValue(undefined);
    descriptions.get.mockResolvedValue([mara]);
    descriptions.savePendingChanges.mockResolvedValue(undefined);
    descriptions.applyUpdateProposal.mockResolvedValue({ status: "applied" });
    activeSelection.select.mockResolvedValue({
      existingCharacterIds: ["mara"],
      newCharacterNames: [],
    });
    sheetSync.synchronize.mockResolvedValue([
      { characterId: "mara", sheetItems: ["Navigator", "Has the key"] },
    ]);
    vi.mocked(d.ChatSettingsService).mockReturnValue(settings as never);
    vi.mocked(d.CharacterUpdateProposalService).mockReturnValue(
      proposals as never,
    );
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue(
      descriptions as never,
    );
    vi.mocked(d.ActiveCharacterSelectionService).mockReturnValue(
      activeSelection as never,
    );
    vi.mocked(d.CharacterSheetSyncService).mockReturnValue(sheetSync as never);
    vi.mocked(d.ErrorService).mockReturnValue(errorService as never);
    service = new CharacterMaintenanceService("chat-1");
  });

  it("counts only toward the configured cadence before doing model work", async () => {
    settings.Get.mockResolvedValue({
      characterSheetsAutoSyncEnabled: true,
      characterSheetsSyncInterval: 3,
      characterSheetsMessagesSinceLastSync: 1,
    });

    await expect(
      service.maybeCreateProposalAfterSavedUserTurn(),
    ).resolves.toEqual({
      status: "skipped",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
      reason: "interval",
    });
    expect(settings.update).toHaveBeenCalledWith({
      characterSheetsMessagesSinceLastSync: 2,
    });
    expect(activeSelection.select).not.toHaveBeenCalled();
  });

  it("does not replace or count past an unresolved proposal", async () => {
    proposals.get.mockResolvedValue({ id: "pending" });

    await expect(
      service.maybeCreateProposalAfterSavedUserTurn(),
    ).resolves.toMatchObject({ reason: "pending-approval" });
    expect(settings.update).not.toHaveBeenCalled();
    expect(proposals.save).not.toHaveBeenCalled();
  });

  it("prepares but never applies automatic cast and sheet changes", async () => {
    settings.Get.mockResolvedValue({
      characterSheetsAutoSyncEnabled: true,
      characterSheetsSyncInterval: 3,
      characterSheetsMessagesSinceLastSync: 2,
    });
    activeSelection.select.mockResolvedValue({
      existingCharacterIds: [],
      newCharacterNames: ["Talia"],
    });
    sheetSync.synchronize.mockImplementation(
      async (characters: CharacterDescription[]) => [
        {
          characterId: characters[0].id,
          sheetItems: ["Carries the brass key"],
        },
      ],
    );

    await expect(
      service.maybeCreateProposalAfterSavedUserTurn(),
    ).resolves.toEqual({
      status: "proposal-created",
      proposedChangeCount: 2,
      autoAppliedChangeCount: 0,
    });
    expect(settings.update).toHaveBeenCalledWith({
      characterSheetsMessagesSinceLastSync: 0,
    });
    expect(sheetSync.synchronize).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Talia", detectedActive: true }),
    ]);
    expect(proposals.save).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "automatic",
        changes: expect.arrayContaining([
          expect.objectContaining({
            characterId: "mara",
            proposedDetectedActive: false,
          }),
          expect.objectContaining({
            characterName: "Talia",
            isNew: true,
            proposedSheetItems: ["Carries the brass key"],
          }),
        ]),
      }),
    );
    expect(descriptions.applyUpdateProposal).not.toHaveBeenCalled();
  });

  it("keeps a manually active character in sheet synchronization", async () => {
    const overridden = createCharacter({
      activeOverride: true,
      detectedActive: true,
    });
    descriptions.get.mockResolvedValue([overridden]);
    activeSelection.select.mockResolvedValue({
      existingCharacterIds: [],
      newCharacterNames: [],
    });
    sheetSync.synchronize.mockResolvedValue([
      { characterId: "mara", sheetItems: ["Navigator"] },
    ]);

    await service.synchronizeNow();

    expect(sheetSync.synchronize).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "mara",
        detectedActive: false,
        activeOverride: true,
      }),
    ]);
  });

  it("prepares an individual manual sheet replacement for approval", async () => {
    const result = await service.generateOrUpdateCharacter("mara");

    expect(descriptions.savePendingChanges).toHaveBeenCalledOnce();
    expect(sheetSync.synchronize).toHaveBeenCalledWith([mara]);
    expect(result).toEqual({
      status: "proposal-created",
      proposedChangeCount: 1,
      autoAppliedChangeCount: 0,
    });
    expect(proposals.save).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "manual",
        changes: [
          expect.objectContaining({
            characterId: "mara",
            proposedSheetItems: ["Navigator", "Has the key"],
          }),
        ],
      }),
    );
  });

  it("does not generate or update an untracked character", async () => {
    descriptions.get.mockResolvedValue([
      createCharacter({ isTracked: false }),
    ]);

    await expect(
      service.generateOrUpdateCharacter("mara"),
    ).resolves.toEqual({
      status: "skipped",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
      reason: "tracking-disabled",
    });
    expect(sheetSync.synchronize).not.toHaveBeenCalled();
  });

  it("keeps untracked characters out of automatic activity and sheet changes", async () => {
    descriptions.get.mockResolvedValue([
      createCharacter({ isTracked: false, detectedActive: true }),
    ]);
    activeSelection.select.mockResolvedValue({
      existingCharacterIds: ["mara"],
      newCharacterNames: [],
    });
    sheetSync.synchronize.mockResolvedValue([]);

    await expect(service.synchronizeNow()).resolves.toEqual({
      status: "unchanged",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
    });
    expect(sheetSync.synchronize).toHaveBeenCalledWith([]);
    expect(proposals.save).not.toHaveBeenCalled();
  });

  it("automatically applies an opted-in character without leaving a proposal", async () => {
    descriptions.get.mockResolvedValue([
      createCharacter({ autoAcceptChanges: true }),
    ]);

    await expect(
      service.generateOrUpdateCharacter("mara"),
    ).resolves.toEqual({
      status: "auto-applied",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 1,
    });
    expect(descriptions.applyUpdateProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            characterId: "mara",
            proposedSheetItems: ["Navigator", "Has the key"],
          }),
        ],
      }),
    );
    expect(proposals.discard).toHaveBeenCalledOnce();
  });

  it("applies opted-in changes and saves the rest of a mixed batch for review", async () => {
    const automaticMara = createCharacter({ autoAcceptChanges: true });
    const reviewIvo = createCharacter({
      id: "ivo",
      name: "Ivo",
      sheetItems: ["Scout"],
    });
    descriptions.get.mockResolvedValue([automaticMara, reviewIvo]);
    activeSelection.select.mockResolvedValue({
      existingCharacterIds: ["mara", "ivo"],
      newCharacterNames: [],
    });
    sheetSync.synchronize.mockResolvedValue([
      { characterId: "mara", sheetItems: ["Navigator", "Has the key"] },
      { characterId: "ivo", sheetItems: ["Scout", "Keeps watch"] },
    ]);

    await expect(service.synchronizeNow()).resolves.toEqual({
      status: "proposal-created",
      proposedChangeCount: 1,
      autoAppliedChangeCount: 1,
    });
    expect(proposals.save).toHaveBeenCalledTimes(2);
    expect(proposals.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            characterId: "ivo",
            proposedSheetItems: ["Scout", "Keeps watch"],
          }),
        ],
      }),
    );
  });

  it("keeps the full batch for review when automatic acceptance conflicts", async () => {
    descriptions.get.mockResolvedValue([
      createCharacter({ autoAcceptChanges: true }),
    ]);
    descriptions.applyUpdateProposal.mockResolvedValue({
      status: "conflict",
      characterNames: ["Mara"],
    });

    await expect(
      service.generateOrUpdateCharacter("mara"),
    ).resolves.toEqual({
      status: "proposal-created",
      proposedChangeCount: 1,
      autoAppliedChangeCount: 0,
    });
    expect(proposals.save).toHaveBeenCalledOnce();
    expect(proposals.discard).not.toHaveBeenCalled();
  });

  it("does not create an empty proposal when sheets are unchanged", async () => {
    sheetSync.synchronize.mockResolvedValue([
      { characterId: "mara", sheetItems: ["Navigator"] },
    ]);

    await expect(service.generateOrUpdateCharacter("mara")).resolves.toEqual({
      status: "unchanged",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
    });
    expect(proposals.save).not.toHaveBeenCalled();
  });

  it("does not create a proposal when sheet items only change order", async () => {
    sheetSync.synchronize.mockResolvedValue([
      { characterId: "mara", sheetItems: ["Has the key", "Navigator"] },
    ]);
    descriptions.get.mockResolvedValue([
      createCharacter({ sheetItems: ["Navigator", "Has the key"] }),
    ]);

    await expect(service.generateOrUpdateCharacter("mara")).resolves.toEqual({
      status: "unchanged",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
    });
    expect(proposals.save).not.toHaveBeenCalled();
  });

  it("contains generation failures and leaves saved characters untouched", async () => {
    const failure = new Error("model failed");
    activeSelection.select.mockRejectedValue(failure);

    await expect(service.synchronizeNow()).resolves.toEqual({
      status: "failed",
      proposedChangeCount: 0,
      autoAppliedChangeCount: 0,
      reason: "error",
    });
    expect(errorService.log).toHaveBeenCalledWith(
      "Failed to prepare automatic character updates",
      failure,
    );
    expect(proposals.save).not.toHaveBeenCalled();
  });
});

const createCharacter = (
  overrides: Partial<CharacterDescription> = {},
): CharacterDescription => ({
  id: "mara",
  name: "Mara",
  appearance: "",
  sheetItems: ["Navigator"],
  isTracked: true,
  autoAcceptChanges: false,
  detectedActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});
