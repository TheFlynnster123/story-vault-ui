import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "../../../testing";
import type { CharacterDescription } from "../services/CharacterDescription";
import { CharacterCard } from "./CharacterCard";

describe("CharacterCard", () => {
  it("updates per-character AI tracking preferences", async () => {
    const onTrackingChange = vi.fn();
    const onAutoAcceptChangesChange = vi.fn();

    renderCharacterCard({
      onTrackingChange,
      onAutoAcceptChangesChange,
    });

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

  it("disables AI updates and auto-accept for an untracked character", () => {
    renderCharacterCard({
      character: createCharacter({ isTracked: false }),
    });

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
