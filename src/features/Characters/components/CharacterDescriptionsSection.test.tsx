import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "../../../testing";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { CharacterDescriptionsSection } from "./CharacterDescriptionsSection";

vi.mock("../hooks/useCharacterDescriptions");

describe("CharacterDescriptionsSection", () => {
  it("shows the active and total character counts", () => {
    vi.mocked(useCharacterDescriptions).mockReturnValue({
      isLoading: false,
      characters: [
        createCharacter("Mara", true),
        createCharacter("Ivo", false),
        { ...createCharacter("Nell", false), activeOverride: true },
      ],
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("2 active / 3 total")).toBeInTheDocument();
    expect(screen.queryByText("Mara")).not.toBeInTheDocument();
  });

  it("navigates to the full Characters page", async () => {
    const onNavigate = vi.fn();
    vi.mocked(useCharacterDescriptions).mockReturnValue({
      characters: [],
      isLoading: false,
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={onNavigate} />,
    );

    await userEvent.click(screen.getByRole("button"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

const createCharacter = (name: string, detectedActive: boolean) => ({
  id: name,
  name,
  appearance: "",
  sheetItems: [],
  detectedActive,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});
