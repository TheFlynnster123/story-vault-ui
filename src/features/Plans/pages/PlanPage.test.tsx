import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, userEvent } from "../../../testing";
import React from "react";
import { PlanPage } from "./PlanPage";
import type { Plan } from "../services/Plan";
import { d } from "../../../services/Dependencies";

const mockNavigate = vi.fn();
const mockUsePlanCache = vi.fn();
const mockUsePlanGenerationStatus = vi.fn();
const mockSavePendingChanges = vi.fn();
const mockGeneratePlanNow = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ chatId: "chat-1" }),
}));

vi.mock("../hooks/usePlanCache", () => ({
  usePlanCache: (...args: unknown[]) => mockUsePlanCache(...args),
}));

vi.mock("../hooks/usePlanGenerationStatus", () => ({
  usePlanGenerationStatus: (...args: unknown[]) =>
    mockUsePlanGenerationStatus(...args),
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

    mockUsePlanCache.mockReturnValue({
      plans: [createPlan()],
      updatePlanDefinition: vi.fn(),
      addPlan: vi.fn(),
      deletePlan: vi.fn(),
    });
    mockUsePlanGenerationStatus.mockReturnValue({
      isGenerating: () => false,
    });
    vi.mocked(d.PlanService).mockReturnValue({
      savePendingChanges: mockSavePendingChanges,
    } as any);
    vi.mocked(d.PlanGenerationService).mockReturnValue({
      generatePlanNow: mockGeneratePlanNow,
    } as any);
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
      expect(mockNavigate).toHaveBeenCalledWith("/chat/chat-1/plan/plan-1/discuss");
    });
  });
});
