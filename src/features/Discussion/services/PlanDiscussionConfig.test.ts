import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { Plan } from "../../Plans/services/Plan";
import { createPlanDiscussionConfig } from "./PlanDiscussionConfig";

vi.mock("../../../services/Dependencies");

const CHAT_ID = "chat-1";
const PLAN_ID = "plan-1";
const PLAN: Plan = {
  id: PLAN_ID,
  type: "planning",
  name: "Story Arc",
  prompt: "Track the central arc.",
  model: "model/plan",
  refreshInterval: 5,
  messagesSinceLastUpdate: 0,
  consolidateMessageHistory: false,
};

describe("PlanDiscussionConfig", () => {
  const getLatestPlanContent = vi.fn();
  const buildContext = vi.fn();
  const regeneratePlanFromMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getLatestPlanContent.mockReturnValue("Target plan content");
    buildContext.mockResolvedValue([
      { id: "message-1", role: "user", content: "Story context" },
    ]);
    regeneratePlanFromMessage.mockResolvedValue(undefined);

    vi.mocked(d.PlanService).mockReturnValue({
      getPlans: vi.fn().mockReturnValue([PLAN]),
    } as unknown as ReturnType<typeof d.PlanService>);
    vi.mocked(d.UserChatProjection).mockReturnValue({
      GetLatestPlanContent: getLatestPlanContent,
    } as unknown as ReturnType<typeof d.UserChatProjection>);
    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildContext,
    } as unknown as ReturnType<typeof d.LLMMessageContextService>);
    vi.mocked(d.PlanGenerationService).mockReturnValue({
      regeneratePlanFromMessage,
    } as unknown as ReturnType<typeof d.PlanGenerationService>);
  });

  it("uses content from the requested Plan definition", () => {
    const config = createPlanDiscussionConfig(CHAT_ID, PLAN_ID);

    expect(config.buildSystemPrompt()).toContain("Target plan content");
    expect(getLatestPlanContent).toHaveBeenCalledWith(PLAN_ID);
  });

  it("requests configured history with every Plan excluded", async () => {
    const config = createPlanDiscussionConfig(CHAT_ID, PLAN_ID);

    await expect(config.getChatMessages()).resolves.toEqual([
      { id: "message-1", role: "user", content: "Story context" },
    ]);
    expect(buildContext).toHaveBeenCalledWith({ history: true });
  });

  it("passes the requested Plan content into regeneration", async () => {
    const config = createPlanDiscussionConfig(CHAT_ID, PLAN_ID);

    await config.generateFromFeedback("Raise the stakes.");

    expect(regeneratePlanFromMessage).toHaveBeenCalledWith(
      PLAN_ID,
      "Target plan content",
      "Raise the stakes.",
    );
  });

  it("uses the Plan model override", () => {
    const config = createPlanDiscussionConfig(CHAT_ID, PLAN_ID);

    expect(config.getDefaultModel()).toBe("model/plan");
  });
});
