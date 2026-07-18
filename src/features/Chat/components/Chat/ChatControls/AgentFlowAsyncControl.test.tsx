import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../../testing";
import { d } from "../../../../../services/Dependencies";
import { AgentFlowAsyncControl } from "./AgentFlowAsyncControl";
import { executeAgentFlowAction } from "../../../services/AgentFlow/AgentFlowActionExecutor";

vi.mock("../../../../../services/Dependencies");
vi.mock("../../../services/AgentFlow/AgentFlowActionExecutor");
vi.mock("./ChapterCreationContext", () => ({
  useChapterCreation: () => ({ openEditor: vi.fn() }),
}));

describe("AgentFlowAsyncControl", () => {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const resolveAction = vi.fn().mockResolvedValue(undefined);
  const dismissSuggestion = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(executeAgentFlowAction).mockResolvedValue("Completed.");
  });

  it("reviews, confirms, and dismisses pending suggestions", async () => {
    const user = userEvent.setup();
    const action = {
      tool: "save_memory" as const,
      title: "Save preference",
      reason: "Keep this for continuity.",
      args: { content: "She hates roses." },
      requiresConfirmation: true,
    };
    vi.mocked(d.AgentFlowService).mockReturnValue({
      CurrentSuggestion: {
        intent: "update_memory",
        confidence: 0.82,
        rationale: "A durable preference was introduced.",
        proposedActions: [action],
      },
      subscribe: vi.fn(() => vi.fn()),
      initialize,
      resolveAction,
      dismissSuggestion,
    } as never);

    render(<AgentFlowAsyncControl chatId="chat-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "Review Agent Flow suggestions",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Review workflow suggestion" }),
    ).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(executeAgentFlowAction).toHaveBeenCalledWith(
      "chat-1",
      action,
      expect.any(Object),
    );
    expect(resolveAction).toHaveBeenCalledWith(0);
    await user.click(
      screen.getByRole("button", { name: "Dismiss suggestion" }),
    );

    expect(dismissSuggestion).toHaveBeenCalledOnce();
  });

  it("stays hidden when analysis has no executable actions", () => {
    vi.mocked(d.AgentFlowService).mockReturnValue({
      CurrentSuggestion: {
        intent: "continue_chat",
        confidence: 0.4,
        rationale: "No workflow change is useful.",
        proposedActions: [],
      },
      subscribe: vi.fn(() => vi.fn()),
      initialize,
      resolveAction,
      dismissSuggestion,
    } as never);

    render(<AgentFlowAsyncControl chatId="chat-1" />);

    expect(
      screen.queryByRole("button", {
        name: "Review Agent Flow suggestions",
      }),
    ).not.toBeInTheDocument();
  });
});
