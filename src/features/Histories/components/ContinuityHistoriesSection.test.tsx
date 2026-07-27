import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../testing";
import { d } from "../../../services/Dependencies";
import { createDefaultContinuityHistoryStore } from "../services/ContinuityHistory";
import { ContinuityHistoriesSection } from "./ContinuityHistoriesSection";

const mockUseContinuityHistories = vi.fn();

vi.mock("../hooks/useContinuityHistories", () => ({
  useContinuityHistories: () => mockUseContinuityHistories(),
}));
vi.mock("../../../services/Dependencies");

describe("ContinuityHistoriesSection", () => {
  const updateSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContinuityHistories.mockReturnValue({
      store: createDefaultContinuityHistoryStore(),
      isLoading: false,
    });
    vi.mocked(d.ContinuityHistoriesService).mockReturnValue({
      updateSettings,
    } as never);
  });

  it("enables the feature without deleting existing state", async () => {
    const user = userEvent.setup();
    render(
      <ContinuityHistoriesSection chatId="chat-1" onNavigate={vi.fn()} />,
    );

    await user.click(
      screen.getByRole("switch", { name: "Enable Continuity Histories" }),
    );

    expect(updateSettings).toHaveBeenCalledWith({
      enabled: true,
      messagesSinceLastRefresh: 0,
    });
  });

  it("opens the management page through its navigation callback", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <ContinuityHistoriesSection
        chatId="chat-1"
        onNavigate={onNavigate}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Manage Histories" }),
    );

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
