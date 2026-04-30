import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "../../../../testing";
import { ChatEntriesList } from "./ChatEntriesList";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";

vi.mock("../../hooks/useUserChatProjection");

vi.mock("./ChatEntries/ChatEntry", () => ({
  ChatEntry: ({ message }: { message: { id: string } }) => (
    <div>{message.id}</div>
  ),
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent, atBottomStateChange }: any) => (
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
    vi.mocked(useUserChatProjection).mockReturnValue({
      messages: [{ id: "message-1" } as any],
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
});
