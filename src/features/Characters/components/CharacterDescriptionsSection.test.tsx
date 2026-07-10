import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../../../testing";
import { CharacterDescriptionsSection } from "./CharacterDescriptionsSection";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { d } from "../../../services/Dependencies";

vi.mock("../hooks/useCharacterDescriptions");
vi.mock("../../../services/Dependencies");

beforeEach(() => {
  vi.mocked(d.ChatSettingsService).mockReturnValue({
    Get: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  } as never);
  vi.mocked(d.CharacterSheetGenerationService).mockReturnValue({
    generateNow: vi.fn().mockResolvedValue(0),
  } as never);
});

describe("CharacterDescriptionsSection", () => {
  it("shows empty state when no characters exist", () => {
    vi.mocked(useCharacterDescriptions).mockReturnValue({
      characters: [],
      isLoading: false,
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
    expect(screen.getByText("No characters saved")).toBeInTheDocument();
  });

  it("shows preview data and expands full list", async () => {
    const user = userEvent.setup();

    vi.mocked(useCharacterDescriptions).mockReturnValue({
      isLoading: false,
      characters: [
        {
          id: "c-1",
          name: "Sarah Chen",
          appearance: "Dark hair, green eyes",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "c-2",
          name: "Marcus Vale",
          appearance: "No character appearance was generated.",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "c-3",
          name: "Elena Ward",
          appearance: "Silver eyes, short black hair",
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

  it("exposes automatic generation, cadence, placement, and manual checking controls", async () => {
    const user = userEvent.setup();
    const generateNow = vi.fn().mockResolvedValue(1);
    vi.mocked(d.CharacterSheetGenerationService).mockReturnValue({
      generateNow,
    } as never);
    vi.mocked(useCharacterDescriptions).mockReturnValue({
      characters: [],
      isLoading: false,
    });

    render(
      <CharacterDescriptionsSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    expect(
      screen.getByText("Automatically create sheets for new primary characters"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Check every N user messages")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Keep N recent messages after character context"),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Check now"));

    expect(generateNow).toHaveBeenCalled();
    expect(screen.getByText("Generated 1 character sheet.")).toBeInTheDocument();
  });
});
