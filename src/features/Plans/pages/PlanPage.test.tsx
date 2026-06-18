import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, userEvent } from "../../../testing";
import React from "react";
import { PlanPage } from "./PlanPage";
import type { Plan } from "../services/Plan";
import type { PlanGenerationService } from "../services/PlanGenerationService";
import type { PlanService } from "../services/PlanService";
import { d } from "../../../services/Dependencies";

const mockNavigate = vi.fn();
const mockUsePlanCache = vi.fn();
const mockUsePlanGenerationStatus = vi.fn();
const mockSavePendingChanges = vi.fn();
const mockGeneratePlanNow = vi.fn();
const mockRegeneratePlanFromMessage = vi.fn();
const mockSuggestPlanDirections = vi.fn();
const mockErrorLog = vi.fn();
let mockLatestPlanContent: string | undefined;

const mockPlanService: Partial<PlanService> = {
  savePendingChanges: mockSavePendingChanges,
};

const mockPlanGenerationService: Partial<PlanGenerationService> = {
  generatePlanNow: mockGeneratePlanNow,
  regeneratePlanFromMessage: mockRegeneratePlanFromMessage,
  suggestPlanDirections: mockSuggestPlanDirections,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ chatId: "chat-1" }),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../hooks/usePlanCache", () => ({
  usePlanCache: (...args: unknown[]) => mockUsePlanCache(...args),
}));

vi.mock("../hooks/usePlanGenerationStatus", () => ({
  usePlanGenerationStatus: (...args: unknown[]) =>
    mockUsePlanGenerationStatus(...args),
}));

vi.mock("../hooks/usePlanPresets", () => ({
  usePlanPresets: () => ({
    presets: [],
    isLoading: false,
    savePreset: vi.fn(),
    deletePreset: vi.fn(),
  }),
  getPlanPresetByName: vi.fn(),
}));

vi.mock("../hooks/usePlanContent", () => ({
  usePlanContent: () => ({
    getLatestPlanContent: () => mockLatestPlanContent,
  }),
}));

vi.mock("../../../services/Dependencies");

vi.mock("../../../components/Page", () => ({
  Page: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../components/ConfirmModal", () => ({
  ConfirmModal: () => null,
}));

vi.mock("../../AI/components/ModelSelect", () => ({
  ModelSelect: () => null,
}));

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "plan-1",
  type: "planning",
  name: "Story Plan",
  prompt: "Prompt",
  refreshInterval: 0,
  messagesSinceLastUpdate: 0,
  consolidateMessageHistory: false,
  hideOtherPlans: false,
  excludeOwnPlanFromHistory: false,
  ...overrides,
});

describe("PlanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLatestPlanContent = undefined;

    mockUsePlanCache.mockReturnValue({
      plans: [createPlan()],
      updatePlanDefinition: vi.fn(),
      addPlan: vi.fn(),
      deletePlan: vi.fn(),
    });
    mockUsePlanGenerationStatus.mockReturnValue({
      isGenerating: () => false,
    });
    mockSuggestPlanDirections.mockResolvedValue([
      "Escalate the secret alliance into a public betrayal.",
      "Send the protagonists after the missing witness.",
      "Force a choice between victory and loyalty.",
    ]);
    vi.mocked(d.PlanService).mockReturnValue(mockPlanService as PlanService);
    vi.mocked(d.PlanGenerationService).mockReturnValue(
      mockPlanGenerationService as PlanGenerationService,
    );
    vi.mocked(d.ErrorService).mockReturnValue({
      log: mockErrorLog,
    } as unknown as ReturnType<typeof d.ErrorService>);
  });

  it("should show manual-only status for plans with refresh interval 0", () => {
    render(<PlanPage />);

    expect(screen.getByText("Manual only")).toBeInTheDocument();
    expect(
      screen.getByText("Set to 0 to disable automatic generation."),
    ).toBeInTheDocument();
  });

  it("should open plan discussion from the plan page", async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Discuss Plan" }));

    await waitFor(() => {
      expect(mockSavePendingChanges).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        "/chat/chat-1/plan/plan-1/discuss",
      );
    });
  });

  it("should stay on the page when saving before discussion fails", async () => {
    const user = userEvent.setup();
    mockSavePendingChanges.mockRejectedValueOnce(new Error("Save failed"));
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Discuss Plan" }));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockErrorLog).toHaveBeenCalledWith(
        "Failed to save plan changes",
        expect.any(Error),
      );
    });
  });

  it("should choose from scratch from the generate modal", async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Generate Now" }));
    await user.click(
      await screen.findByRole("button", { name: "From Scratch" }),
    );

    expect(mockGeneratePlanNow).toHaveBeenCalledWith("plan-1");
  });

  it("should generate with direction from the generate modal", async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Generate Now" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Direction" }),
      "Add a timeline.",
    );
    await user.click(screen.getByRole("button", { name: "With Direction" }));

    expect(mockRegeneratePlanFromMessage).toHaveBeenCalledWith(
      "plan-1",
      undefined,
      "Add a timeline.",
    );
  });

  it("should suggest plans from the full plan page", async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Suggest Plan" }));

    expect(mockSuggestPlanDirections).toHaveBeenCalledWith(
      "plan-1",
      undefined,
    );
    expect(
      await screen.findByRole("button", {
        name: "Escalate the secret alliance into a public betrayal.",
      }),
    ).toBeInTheDocument();
  });

  it("should generate a full plan from the selected suggestion", async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByRole("button", { name: "Suggest Plan" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Send the protagonists after the missing witness.",
      }),
    );

    expect(mockRegeneratePlanFromMessage).toHaveBeenCalledWith(
      "plan-1",
      undefined,
      "Send the protagonists after the missing witness.",
    );
  });

  it("should consolidate regenerate actions into one modal", async () => {
    const user = userEvent.setup();
    mockLatestPlanContent = "Existing plan";
    render(<PlanPage />);

    expect(
      screen.queryByRole("button", { name: "Regenerate with Feedback" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Direction" }),
      "More character motivation.",
    );
    await user.click(screen.getByRole("button", { name: "With Direction" }));

    expect(mockRegeneratePlanFromMessage).toHaveBeenCalledWith(
      "plan-1",
      "Existing plan",
      "More character motivation.",
    );
  });
});
