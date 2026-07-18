import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { CharacterUpdateProposal } from "./CharacterUpdateProposal";
import { CharacterUpdateProposalService } from "./CharacterUpdateProposalService";

vi.mock("../../../services/Dependencies");

describe("CharacterUpdateProposalService", () => {
  const proposal = createProposal();
  const blob = {
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    subscribe: vi.fn(),
  };
  const descriptions = { applyUpdateProposal: vi.fn() };
  let service: CharacterUpdateProposalService;

  beforeEach(() => {
    vi.clearAllMocks();
    blob.get.mockResolvedValue(proposal);
    descriptions.applyUpdateProposal.mockResolvedValue({ status: "applied" });
    vi.mocked(d.CharacterUpdateProposalManagedBlob).mockReturnValue(
      blob as never,
    );
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue(
      descriptions as never,
    );
    service = new CharacterUpdateProposalService("chat-1");
  });

  it("persists and exposes actionable proposal state", async () => {
    await service.save(proposal);
    await expect(service.get()).resolves.toEqual(proposal);
    expect(blob.save).toHaveBeenCalledWith(proposal);

    const callback = vi.fn();
    service.subscribe(callback);
    expect(blob.subscribe).toHaveBeenCalledWith(callback);
  });

  it("applies then deletes an approved proposal", async () => {
    await expect(service.approve(["mara"])).resolves.toEqual({
      status: "applied",
    });

    expect(descriptions.applyUpdateProposal).toHaveBeenCalledWith(proposal);
    expect(blob.delete).toHaveBeenCalledOnce();
    expect(
      descriptions.applyUpdateProposal.mock.invocationCallOrder[0],
    ).toBeLessThan(blob.delete.mock.invocationCallOrder[0]);
  });

  it("keeps a conflicted proposal available for review", async () => {
    descriptions.applyUpdateProposal.mockResolvedValue({
      status: "conflict",
      characterNames: ["Mara"],
    });

    await expect(service.approve(["mara"])).resolves.toEqual({
      status: "conflict",
      characterNames: ["Mara"],
    });
    expect(blob.delete).not.toHaveBeenCalled();
  });

  it("does not mutate characters when the proposal is missing", async () => {
    blob.get.mockResolvedValue(undefined);

    await expect(service.approve(["mara"])).resolves.toEqual({
      status: "missing",
    });
    expect(descriptions.applyUpdateProposal).not.toHaveBeenCalled();
    expect(blob.delete).not.toHaveBeenCalled();
  });

  it("explicitly discards proposal state", async () => {
    await service.discard();
    expect(blob.delete).toHaveBeenCalledOnce();
  });

  it("applies only the confirmed character changes", async () => {
    const proposalWithTwoCharacters: CharacterUpdateProposal = {
      ...proposal,
      changes: [
        ...proposal.changes,
        {
          ...proposal.changes[0],
          characterId: "ivo",
          characterName: "Ivo",
        },
      ],
    };
    blob.get.mockResolvedValue(proposalWithTwoCharacters);

    await service.approve(["ivo"]);

    expect(descriptions.applyUpdateProposal).toHaveBeenCalledWith({
      ...proposalWithTwoCharacters,
      changes: [proposalWithTwoCharacters.changes[1]],
    });
  });

  it("discards the proposal when no character changes are confirmed", async () => {
    await expect(service.approve([])).resolves.toEqual({ status: "applied" });

    expect(descriptions.applyUpdateProposal).not.toHaveBeenCalled();
    expect(blob.delete).toHaveBeenCalledOnce();
  });
});

const createProposal = (): CharacterUpdateProposal => ({
  id: "proposal-1",
  source: "automatic",
  createdAt: "2026-01-02",
  changes: [
    {
      characterId: "mara",
      characterName: "Mara",
      baseUpdatedAt: "2026-01-01",
      isNew: false,
      previousSheetItems: [],
      proposedSheetItems: ["Navigator"],
    },
  ],
});
