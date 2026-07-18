import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "../../../testing";
import type { CharacterUpdateProposal } from "../services/CharacterUpdateProposal";
import { CharacterUpdateReviewModal } from "./CharacterUpdateReviewModal";

describe("CharacterUpdateReviewModal", () => {
  it("requires a decision for each character before applying", async () => {
    const onApprove = vi.fn();
    const onDiscard = vi.fn();

    render(
      <CharacterUpdateReviewModal
        proposal={createProposal()}
        opened
        isApplying={false}
        error={undefined}
        onClose={vi.fn()}
        onApprove={onApprove}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByText("Current sheet")).toBeInTheDocument();
    expect(screen.getByText("Proposed sheet")).toBeInTheDocument();
    expect(screen.getAllByText("Navigator")).toHaveLength(2);
    expect(screen.getByText("Carries the brass key")).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing below changes Character Sheets/i),
    ).toBeInTheDocument();

    const applyButton = screen.getByRole("button", {
      name: "Apply decisions",
    });
    expect(applyButton).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm Mara" }),
    );
    expect(applyButton).toBeEnabled();

    await userEvent.click(applyButton);
    expect(onApprove).toHaveBeenCalledWith(["mara"]);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss all" }));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("applies confirmed characters and omits dismissed characters", async () => {
    const onApprove = vi.fn();
    const proposal = createProposal();
    proposal.changes.push({
      ...proposal.changes[0],
      characterId: "ivo",
      characterName: "Ivo",
    });

    render(
      <CharacterUpdateReviewModal
        proposal={proposal}
        opened
        isApplying={false}
        error={undefined}
        onClose={vi.fn()}
        onApprove={onApprove}
        onDiscard={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm Mara" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss Ivo" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Apply decisions" }),
    );

    expect(onApprove).toHaveBeenCalledWith(["mara"]);
  });

  it("discards the proposal when every character is dismissed", async () => {
    const onDiscard = vi.fn();

    render(
      <CharacterUpdateReviewModal
        proposal={createProposal()}
        opened
        isApplying={false}
        error={undefined}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={onDiscard}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss Mara" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Apply decisions" }),
    );

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("surfaces approval conflicts without hiding the proposal", () => {
    render(
      <CharacterUpdateReviewModal
        proposal={createProposal()}
        opened
        isApplying={false}
        error="Mara changed after this proposal was created."
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Mara changed after this proposal was created."),
    ).toBeInTheDocument();
  });
});

const createProposal = (): CharacterUpdateProposal => ({
  id: "proposal",
  source: "automatic",
  createdAt: "2026-01-01",
  changes: [
    {
      characterId: "mara",
      characterName: "Mara",
      baseUpdatedAt: "2026-01-01",
      isNew: false,
      previousSheetItems: ["Navigator"],
      proposedSheetItems: ["Navigator", "Carries the brass key"],
      previousDetectedActive: false,
      proposedDetectedActive: true,
    },
  ],
});
