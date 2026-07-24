import { act, render, screen, waitFor } from "../../../testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { UserChatMessage } from "../../../services/CQRS/UserChatProjection";
import { useUserChatProjection } from "./useUserChatProjection";

vi.mock("../../../services/Dependencies");

const CHAT_ID = "chat-1";

describe("useUserChatProjection", () => {
  let messages: UserChatMessage[];
  let notifyProjection: () => void;

  beforeEach(() => {
    messages = [createMessage("")];
    notifyProjection = () => undefined;

    vi.mocked(d.UserChatProjection).mockReturnValue({
      GetMessages: vi.fn(() => messages),
      subscribe: vi.fn((callback: () => void) => {
        notifyProjection = callback;
        return vi.fn();
      }),
      getChapterMessages: vi.fn(),
    } as unknown as ReturnType<typeof d.UserChatProjection>);

    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({}),
      getCached: vi.fn().mockReturnValue({}),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
  });

  it("renders projection updates without reloading settings for every token", async () => {
    render(<ProjectionContent />);
    await waitFor(() =>
      expect(d.ChatSettingsService(CHAT_ID).Get).toHaveBeenCalledOnce(),
    );

    act(() => {
      messages = [createMessage("First")];
      notifyProjection();
    });
    act(() => {
      messages = [createMessage("First second")];
      notifyProjection();
    });

    expect(screen.getByText("First second")).toBeInTheDocument();
    expect(d.ChatSettingsService(CHAT_ID).Get).toHaveBeenCalledOnce();
  });
});

const ProjectionContent = () => {
  const { messages } = useUserChatProjection(CHAT_ID);
  return <div>{messages[0]?.content}</div>;
};

const createMessage = (content: string): UserChatMessage => ({
  id: "streaming-reasoning",
  type: "reasoning",
  content,
  isStreaming: true,
  hiddenByChapterId: undefined,
  deleted: false,
  hidden: false,
});
