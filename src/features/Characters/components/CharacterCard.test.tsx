import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, within } from "../../../testing";
import type { CharacterDescription } from "../services/CharacterDescription";
import { CharacterCard } from "./CharacterCard";

describe("CharacterCard", () => {
  it("shows the character name and activity while collapsed", () => {
    renderCharacterCard();

    const collapsedHeader = screen.getByRole("button", {
      name: "Expand character Mara",
    });

    expect(within(collapsedHeader).getByText("Mara")).toBeInTheDocument();
    expect(within(collapsedHeader).getByText("Active")).toBeInTheDocument();
    expect(collapsedHeader).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Character Name")).not.toBeInTheDocument();
  });

  it("allows the character name to be edited when expanded", async () => {
    const onNameChange = vi.fn();
    renderCharacterCard({ onNameChange });

    await expandCharacter("Mara");
    await userEvent.type(screen.getByLabelText("Character Name"), "!");

    expect(onNameChange).toHaveBeenCalledWith("Mara!");
  });

  it("expands a new unnamed character by default", () => {
    renderCharacterCard({ character: createCharacter({ name: "" }) });

    expect(screen.getByRole("button", {
      name: "Collapse character Unnamed Character",
    })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Character Name")).toBeVisible();
  });

  it("updates per-character AI tracking preferences", async () => {
    const onTrackingChange = vi.fn();
    const onAutoAcceptChangesChange = vi.fn();

    renderCharacterCard({
      onTrackingChange,
      onAutoAcceptChangesChange,
    });

    await expandCharacter("Mara");

    await userEvent.click(
      screen.getByRole("switch", { name: /^Track with AI/ }),
    );
    await userEvent.click(
      screen.getByRole("switch", {
        name: /^Automatically accept AI changes/,
      }),
    );

    expect(onTrackingChange).toHaveBeenCalledWith(false);
    expect(onAutoAcceptChangesChange).toHaveBeenCalledWith(true);
  });

  it("disables AI updates and auto-accept for an untracked character", async () => {
    renderCharacterCard({
      character: createCharacter({ isTracked: false }),
    });

    await expandCharacter("Mara");

    expect(screen.getByText("Not AI tracked")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: /^Automatically accept AI changes/,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Generate sheet" }),
    ).toBeDisabled();
  });
});

const expandCharacter = async (name: string) => {
  await userEvent.click(
    screen.getByRole("button", { name: `Expand character ${name}` }),
  );
};

const renderCharacterCard = (
  overrides: Partial<React.ComponentProps<typeof CharacterCard>> = {},
) =>
  render(
    <CharacterCard
      character={createCharacter()}
      isGenerating={false}
      generationStatus={undefined}
      hasPendingProposal={false}
      onNameChange={vi.fn()}
      onAppearanceChange={vi.fn()}
      onSheetItemsChange={vi.fn()}
      onAddSheetItem={vi.fn()}
      onTrackingChange={vi.fn()}
      onAutoAcceptChangesChange={vi.fn()}
      onActivityOverrideChange={vi.fn()}
      onUseAutomaticActivity={vi.fn()}
      onGenerateOrUpdate={vi.fn()}
      onPreferredImageChange={vi.fn()}
      onDelete={vi.fn()}
      {...overrides}
    />,
  );

const createCharacter = (
  overrides: Partial<CharacterDescription> = {},
): CharacterDescription => ({
  id: "mara",
  name: "Mara",
  appearance: "",
  sheetItems: [],
  isTracked: true,
  autoAcceptChanges: false,
  detectedActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});
