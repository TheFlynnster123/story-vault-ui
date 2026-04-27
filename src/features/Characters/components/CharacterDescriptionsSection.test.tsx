import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../../../testing";
import { CharacterDescriptionsSection } from "./CharacterDescriptionsSection";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";

vi.mock("../hooks/useCharacterDescriptions");

describe("CharacterDescriptionsSection", () => {
  it("shows empty state when no characters exist", () => {
    vi.mocked(useCharacterDescriptions).mockReturnValue({
      characters: [],
      isLoading: false,
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    expect(screen.getByText("Character Descriptions")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
    expect(
      screen.getByText("No character descriptions saved"),
    ).toBeInTheDocument();
  });

  it("shows preview data and expands full list", async () => {
    const user = userEvent.setup();

    vi.mocked(useCharacterDescriptions).mockReturnValue({
      isLoading: false,
      characters: [
        {
          id: "c-1",
          name: "Sarah Chen",
          description: "Dark hair, green eyes",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "c-2",
          name: "Marcus Vale",
          description: "No character description was generated.",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "c-3",
          name: "Elena Ward",
          description: "Silver eyes, short black hair",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ],
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    expect(screen.getByText("(3)")).toBeInTheDocument();
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Marcus Vale")).toBeInTheDocument();
    expect(screen.queryByText("Elena Ward")).not.toBeInTheDocument();

    await user.click(screen.getByText("Expand"));

    expect(screen.getByText("Elena Ward")).toBeInTheDocument();
  });
});
