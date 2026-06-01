import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, userEvent } from "../../../../testing";
import { ChatEntriesList } from "./ChatEntriesList";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";
import { useSystemSettings } from "../../../SystemSettings/hooks/useSystemSettings";

vi.mock("../../hooks/useUserChatProjection");
vi.mock("../../../SystemSettings/hooks/useSystemSettings");

vi.mock("./ChatEntries/ChatEntry", () => ({
  ChatEntry: ({
    message,
    trailingChapterMessageCount,
  }: {
    message: { id: string };
    trailingChapterMessageCount?: number;
  }) => (
    <div>
      {message.id}
      {trailingChapterMessageCount !== undefined
        ? ` trailing:${trailingChapterMessageCount}`
        : ""}
    </div>
  ),
}));

interface VirtuosoMockProps {
  data: Array<{ id: string }>;
  itemContent: (index: number, item: { id: string }) => ReactNode;
  atBottomStateChange?: (isAtBottom: boolean) => void;
}

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent, atBottomStateChange }: VirtuosoMockProps) => (
    <div data-testid="virtuoso">
      <button onClick={() => atBottomStateChange?.(false)} type="button">
        Not At Bottom
      </button>
      <button onClick={() => atBottomStateChange?.(true)} type="button">
        At Bottom
      </button>
      {data.map((item: { id: string }, index: number) => (
        <div key={item.id}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

describe("ChatEntriesList", () => {
  it("should show an arrow only when there is more content below", async () => {
    vi.mocked(useSystemSettings).mockReturnValue({
      systemSettings: undefined,
      isLoading: false,
      saveSystemSettings: vi.fn(),
    });
    vi.mocked(useUserChatProjection).mockReturnValue({
      messages: [
        {
          id: "message-1",
          type: "user-message",
          content: "Message",
          hiddenByChapterId: undefined,
          deleted: false,
          hidden: false,
        },
      ],
      getChapterMessages: vi.fn(),
    });

    const user = userEvent.setup();

    render(<ChatEntriesList chatId="chat-1" />);

    expect(screen.getByTestId("chat-more-below-indicator")).toHaveStyle({
      opacity: "0",
      visibility: "hidden",
    });

    await user.click(screen.getByRole("button", { name: "Not At Bottom" }));

    expect(screen.getByTestId("chat-more-below-indicator")).toHaveStyle({
      opacity: "1",
      visibility: "visible",
    });

    await user.click(screen.getByRole("button", { name: "At Bottom" }));

    expect(screen.getByTestId("chat-more-below-indicator")).toHaveStyle({
      opacity: "0",
      visibility: "hidden",
    });
  });

  it("passes trailing chapter cue count to the active trailing chapter", () => {
    vi.mocked(useSystemSettings).mockReturnValue({
      systemSettings: {
        chapterCompressionSettings: {
          trailingChapterMessages: 3,
        },
      },
      isLoading: false,
      saveSystemSettings: vi.fn(),
    });
    vi.mocked(useUserChatProjection).mockReturnValue({
      messages: [
        {
          id: "chapter-1",
          type: "chapter",
          content: "Summary",
          hiddenByChapterId: undefined,
          deleted: false,
          hidden: false,
          data: {
            title: "Chapter",
            coveredMessageIds: ["msg-1", "msg-2", "msg-3", "msg-4"],
          },
        },
        {
          id: "msg-5",
          type: "user-message",
          content: "After",
          hiddenByChapterId: undefined,
          deleted: false,
          hidden: false,
        },
      ],
      getChapterMessages: vi.fn(),
    });

    render(<ChatEntriesList chatId="chat-1" />);

    expect(screen.getByText("chapter-1 trailing:3")).toBeInTheDocument();
  });
});
