import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../../testing";
import { PlanSection } from "./PlanSection";
import type { Plan } from "../services/Plan";

const mockUsePlanGenerationStatus = vi.fn();

vi.mock("../hooks/usePlanGenerationStatus", () => ({
  usePlanGenerationStatus: (...args: unknown[]) =>
    mockUsePlanGenerationStatus(...args),
}));

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "plan-1",
  type: "planning",
  name: "Story Plan",
  prompt: "Prompt",
  refreshInterval: 5,
  messagesSinceLastUpdate: 0,
  consolidateMessageHistory: false,
  hideOtherPlans: false,
  excludeOwnPlanFromHistory: false,
  ...overrides,
});

describe("PlanSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePlanGenerationStatus.mockReturnValue({
      isGenerating: () => false,
    });
  });

  it("should explain manual-only plans when refresh interval is 0", () => {
    render(
      <PlanSection
        chatId="chat-1"
        plans={[createPlan({ refreshInterval: 0 })]}
        onNavigate={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Plans set to 0 refresh will only be manually generated."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Story Plan — Manual generation only"),
    ).toBeInTheDocument();
  });
});
