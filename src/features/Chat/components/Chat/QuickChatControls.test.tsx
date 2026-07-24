import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../../../testing";
import { d } from "../../../../services/Dependencies";
import { QuickChatControls } from "./QuickChatControls";

vi.mock("../../../../services/Dependencies");
vi.mock("../../../Plans/hooks/usePlanCache", () => ({
  usePlanCache: () => ({ plans: [] }),
}));
vi.mock("../../../Plans/hooks/usePlanContent", () => ({
  usePlanContent: () => ({ getLatestPlanContent: vi.fn() }),
}));
vi.mock("../../../Plans/hooks/usePlanGenerationStatus", () => ({
  usePlanGenerationStatus: () => ({ isGenerating: vi.fn(() => false) }),
}));
vi.mock("./ChatControls/ChapterCreationContext", () => ({
  useChapterCreation: () => ({
    handleOpenModal: vi.fn(),
    handlePendingDraft: vi.fn(),
    pendingDraftStatus: null,
  }),
}));
vi.mock("../../../Characters/hooks/useCharacterUpdateProposal", () => ({
  useCharacterUpdateProposal: () => ({
    proposal: null,
    isReviewOpen: false,
    isApplying: false,
    error: null,
    openReview: vi.fn(),
    closeReview: vi.fn(),
    approve: vi.fn(),
    discard: vi.fn(),
  }),
}));
vi.mock("../../../Characters/components/CharacterUpdateReviewModal", () => ({
  CharacterUpdateReviewModal: () => null,
}));
vi.mock("./ChatControls/AgentFlowAsyncControl", () => ({
  AgentFlowAsyncControl: () => null,
}));

describe("QuickChatControls", () => {
  const analyzeIntentSuggestion = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(d.AgentFlowService).mockReturnValue({
      analyzeIntentSuggestion,
    } as never);
    vi.mocked(d.CharacterMaintenanceService).mockReturnValue({
      synchronizeNow: vi.fn().mockResolvedValue({
        status: "proposal-created",
        proposedChangeCount: 1,
        autoAppliedChangeCount: 0,
      }),
    } as never);
  });

  it("runs workflow suggestion analysis in the background", async () => {
    const user = userEvent.setup();

    render(<QuickChatControls chatId="chat-1" />);

    await user.click(
      screen.getByRole("button", { name: "Quick Chat Controls" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Suggest Workflow Action/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Quick Chat Controls" }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(analyzeIntentSuggestion).toHaveBeenCalledOnce();
    });
  });

  it("closes Quick Chat Controls when preparing Character Sheet updates", async () => {
    const user = userEvent.setup();

    render(<QuickChatControls chatId="chat-1" />);

    await user.click(
      screen.getByRole("button", { name: "Quick Chat Controls" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: /Prepare Character Sheet Updates/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Quick Chat Controls" }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        d.CharacterMaintenanceService("chat-1").synchronizeNow,
      ).toHaveBeenCalledOnce();
    });
  });
});
