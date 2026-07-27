import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "../../../testing";
import { d } from "../../../services/Dependencies";
import {
  createDefaultContinuityHistoryStore,
  type ContinuityHistoryStore,
} from "../services/ContinuityHistory";
import { ContinuityHistoriesPage } from "./ContinuityHistoriesPage";

const mockNavigate = vi.fn();
const mockUseContinuityHistories = vi.fn();
const save = vi.fn();
const saveDebounced = vi.fn();
const saveManualRevision = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ chatId: "chat-1" }),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../hooks/useContinuityHistories", () => ({
  useContinuityHistories: () => mockUseContinuityHistories(),
}));
vi.mock("../../../components/Page", () => ({
  Page: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../../../components/ConfirmModal", () => ({
  ConfirmModal: () => null,
}));
vi.mock("../../AI/components/ModelSelect", () => ({
  ModelSelect: ({ label }: { label: string }) => <div>{label}</div>,
}));
vi.mock("../../../services/Dependencies");

describe("ContinuityHistoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContinuityHistories.mockReturnValue({
      store: createStore(),
      isLoading: false,
      save,
      saveDebounced,
    });
    vi.mocked(d.ContinuityHistoriesService).mockReturnValue({
      saveManualRevision,
      removeHistory: vi.fn(),
    } as never);
    vi.mocked(d.LLMChatProjection).mockReturnValue({
      GetMessages: vi.fn().mockReturnValue([
        {
          id: "message-1",
          type: "message",
          role: "user",
          content: "The key turns.",
        },
      ]),
    } as never);
  });

  it("shows the full feature and retrieval configuration", () => {
    render(<ContinuityHistoriesPage />);

    expect(
      screen.getByRole("switch", {
        name: "Enable Continuity Histories for this chat",
      }),
    ).toBeChecked();
    expect(
      screen.getByLabelText("Refresh every N saved user turns"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Messages analyzed per refresh"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Recent messages used for relevance"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Keep N recent messages after Histories"),
    ).toBeInTheDocument();
    expect(screen.getByText("History model")).toBeInTheDocument();
  });

  it("persists the master toggle without removing Histories", async () => {
    const user = userEvent.setup();
    render(<ContinuityHistoriesPage />);

    await user.click(
      screen.getByRole("switch", {
        name: "Enable Continuity Histories for this chat",
      }),
    );

    expect(saveDebounced).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ enabled: false }),
        histories: expect.arrayContaining([
          expect.objectContaining({ id: "key" }),
        ]),
      }),
    );
  });

  it("saves a manual revision at the latest ordinary message boundary", async () => {
    const user = userEvent.setup();
    render(<ContinuityHistoriesPage />);

    await user.clear(screen.getByLabelText("Current revision"));
    await user.type(
      screen.getByLabelText("Current revision"),
      "The key opens the lighthouse.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save manual revision" }),
    );

    await waitFor(() => {
      expect(saveManualRevision).toHaveBeenCalledWith(
        "key",
        "The key opens the lighthouse.",
        "message-1",
      );
    });
  });
});

const createStore = (): ContinuityHistoryStore => {
  const store = createDefaultContinuityHistoryStore();
  return {
    ...store,
    settings: {
      ...store.settings,
      enabled: true,
    },
    histories: [
      {
        id: "key",
        title: "The Brass Key",
        description: "Track the key.",
        kind: "object",
        routingHints: ["brass key"],
        inclusion: "automatic",
        revisions: [
          {
            id: "revision-1",
            content: "The key is missing.",
            sourceMessageIds: ["message-1"],
            coveredThroughMessageId: "message-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            origin: "llm",
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
};
