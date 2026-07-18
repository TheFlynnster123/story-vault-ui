import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../../testing";
import { d } from "../../../../../services/Dependencies";
import { AgentFlowSection } from "./AgentFlowSection";

const openEditor = vi.fn();

vi.mock("../../../../../services/Dependencies");
vi.mock("../ChatControls/ChapterCreationContext", () => ({
  useChapterCreation: () => ({ openEditor }),
}));

describe("AgentFlowSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(d.AgentFlowService).mockReturnValue({
      CurrentSuggestion: {
        intent: "create_chapter",
        confidence: 0.9,
        rationale: "The scene reached a natural boundary.",
        proposedActions: [
          {
            tool: "create_chapter",
            title: "Create the chapter",
            reason: "Review the suggested draft.",
            args: {
              title: "Suggested title",
              summary: "Suggested summary",
            },
            requiresConfirmation: true,
          },
        ],
      },
      IsLoading: false,
      subscribe: vi.fn(() => vi.fn()),
    } as never);
  });

  it("routes complete chapter suggestions through the shared editor", async () => {
    const user = userEvent.setup();
    render(
      <AgentFlowSection
        chatId="chat-1"
        onNavigateToMemories={vi.fn()}
        onNavigateToPlans={vi.fn()}
        onNavigateToSettings={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(openEditor).toHaveBeenCalledWith(
      "Suggested title",
      "Suggested summary",
    );
    expect(d.ChatService).not.toHaveBeenCalled();
  });
});
