import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../../../testing";
import type { ReasoningChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { ReasoningMessage } from "./ReasoningMessage";

vi.mock("./ChatEntryButtons/MessageOverlay", () => ({
  MessageOverlay: () => null,
}));

vi.mock("./ChatEntryButtons/MessageButtonsContainer", () => ({
  MessageButtonsContainer: () => null,
}));

const createReasoningMessage = (
  overrides: Partial<ReasoningChatMessage> = {},
): ReasoningChatMessage => ({
  id: "reasoning-1",
  type: "reasoning",
  content: "Follow the clue as it arrives.",
  hiddenByChapterId: undefined,
  deleted: false,
  hidden: false,
  ...overrides,
});

describe("ReasoningMessage", () => {
  it("shows streamed reasoning content as it arrives", () => {
    render(
      <ReasoningMessage
        chatId="chat-1"
        message={createReasoningMessage({ isStreaming: true })}
        isLastMessage
      />,
    );

    expect(
      screen.getByRole("button", { name: /Reasoning/ }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Follow the clue as it arrives.")).toBeVisible();
  });

  it("keeps persisted reasoning collapsed by default", () => {
    render(
      <ReasoningMessage
        chatId="chat-1"
        message={createReasoningMessage()}
        isLastMessage
      />,
    );

    expect(
      screen.getByRole("button", { name: /Reasoning/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("Follow the clue as it arrives."),
    ).not.toBeInTheDocument();
  });
});
