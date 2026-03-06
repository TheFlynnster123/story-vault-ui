import { describe, it, expect } from "vitest";
import {
  applyPlanDefaults,
  isDueForRefresh,
  resetMessageCounter,
  incrementMessageCounter,
  formatRefreshStatus,
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_PLAN_PROMPT,
  DEFAULT_PLAN_NAME,
} from "./Plan";
import type { Plan } from "./Plan";

// ---- Factory Helpers ----

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "plan-1",
  type: "planning",
  name: "Test Plan",
  prompt: "Test prompt",
  refreshInterval: 5,
  messagesSinceLastUpdate: 0,
  ...overrides,
});

// ---- Exported Constants ----

describe("Plan Constants", () => {
  it("should have a default refresh interval of 5", () => {
    expect(DEFAULT_REFRESH_INTERVAL).toBe(5);
  });

  it("should have a non-empty default plan prompt", () => {
    expect(DEFAULT_PLAN_PROMPT.length).toBeGreaterThan(0);
    expect(DEFAULT_PLAN_PROMPT).toContain("Active Character Arcs");
  });

  it("should have a default plan name", () => {
    expect(DEFAULT_PLAN_NAME).toBe("Story Plan");
  });
});

// ---- applyPlanDefaults ----

describe("applyPlanDefaults", () => {
  it("should add default refreshInterval when missing", () => {
    const legacyPlan = {
      id: "plan-1",
      type: "planning" as const,
      name: "Old Plan",
      prompt: "Old prompt",
    };

    const result = applyPlanDefaults(legacyPlan);

    expect(result.refreshInterval).toBe(DEFAULT_REFRESH_INTERVAL);
  });

  it("should add default messagesSinceLastUpdate when missing", () => {
    const legacyPlan = {
      id: "plan-1",
      type: "planning" as const,
      name: "Old Plan",
      prompt: "Old prompt",
    };

    const result = applyPlanDefaults(legacyPlan);

    expect(result.messagesSinceLastUpdate).toBe(0);
  });

  it("should preserve existing refreshInterval", () => {
    const plan = createPlan({ refreshInterval: 10 });

    const result = applyPlanDefaults(plan);

    expect(result.refreshInterval).toBe(10);
  });

  it("should preserve existing messagesSinceLastUpdate", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 3 });

    const result = applyPlanDefaults(plan);

    expect(result.messagesSinceLastUpdate).toBe(3);
  });

  it("should preserve all original fields", () => {
    const plan = createPlan({ content: "Some content" });

    const result = applyPlanDefaults(plan);

    expect(result.id).toBe(plan.id);
    expect(result.type).toBe(plan.type);
    expect(result.name).toBe(plan.name);
    expect(result.prompt).toBe(plan.prompt);
    expect(result.content).toBe("Some content");
  });
});

// ---- isDueForRefresh ----

describe("isDueForRefresh", () => {
  it("should return true when counter equals refresh interval", () => {
    const plan = createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 5 });

    expect(isDueForRefresh(plan)).toBe(true);
  });

  it("should return true when counter exceeds refresh interval", () => {
    const plan = createPlan({
      refreshInterval: 5,
      messagesSinceLastUpdate: 10,
    });

    expect(isDueForRefresh(plan)).toBe(true);
  });

  it("should return false when counter is below refresh interval", () => {
    const plan = createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 3 });

    expect(isDueForRefresh(plan)).toBe(false);
  });

  it("should return true for a brand-new plan with interval 0", () => {
    const plan = createPlan({ refreshInterval: 0, messagesSinceLastUpdate: 0 });

    expect(isDueForRefresh(plan)).toBe(true);
  });

  it("should return true for counter at 0 with interval 0", () => {
    const plan = createPlan({ refreshInterval: 0, messagesSinceLastUpdate: 0 });

    expect(isDueForRefresh(plan)).toBe(true);
  });

  it("should return false for counter at 0 with interval 1", () => {
    const plan = createPlan({ refreshInterval: 1, messagesSinceLastUpdate: 0 });

    expect(isDueForRefresh(plan)).toBe(false);
  });
});

// ---- resetMessageCounter ----

describe("resetMessageCounter", () => {
  it("should set messagesSinceLastUpdate to 0", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 7 });

    const result = resetMessageCounter(plan);

    expect(result.messagesSinceLastUpdate).toBe(0);
  });

  it("should preserve all other plan fields", () => {
    const plan = createPlan({
      content: "Some content",
      refreshInterval: 10,
      messagesSinceLastUpdate: 7,
    });

    const result = resetMessageCounter(plan);

    expect(result.id).toBe(plan.id);
    expect(result.name).toBe(plan.name);
    expect(result.content).toBe("Some content");
    expect(result.refreshInterval).toBe(10);
  });

  it("should return a new object (immutable)", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 3 });

    const result = resetMessageCounter(plan);

    expect(result).not.toBe(plan);
  });
});

// ---- incrementMessageCounter ----

describe("incrementMessageCounter", () => {
  it("should increment messagesSinceLastUpdate by 1", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 3 });

    const result = incrementMessageCounter(plan);

    expect(result.messagesSinceLastUpdate).toBe(4);
  });

  it("should increment from 0 to 1", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 0 });

    const result = incrementMessageCounter(plan);

    expect(result.messagesSinceLastUpdate).toBe(1);
  });

  it("should preserve all other plan fields", () => {
    const plan = createPlan({
      content: "Content",
      refreshInterval: 3,
      messagesSinceLastUpdate: 2,
    });

    const result = incrementMessageCounter(plan);

    expect(result.id).toBe(plan.id);
    expect(result.name).toBe(plan.name);
    expect(result.content).toBe("Content");
    expect(result.refreshInterval).toBe(3);
  });

  it("should return a new object (immutable)", () => {
    const plan = createPlan({ messagesSinceLastUpdate: 0 });

    const result = incrementMessageCounter(plan);

    expect(result).not.toBe(plan);
  });
});

// ---- formatRefreshStatus ----

describe("formatRefreshStatus", () => {
  it("should show remaining messages out of total", () => {
    const plan = createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 2 });

    expect(formatRefreshStatus(plan)).toBe("3/5");
  });

  it("should show 0 remaining when due for refresh", () => {
    const plan = createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 5 });

    expect(formatRefreshStatus(plan)).toBe("0/5");
  });

  it("should not show negative numbers when counter exceeds interval", () => {
    const plan = createPlan({
      refreshInterval: 3,
      messagesSinceLastUpdate: 10,
    });

    expect(formatRefreshStatus(plan)).toBe("0/3");
  });

  it("should show full interval when counter is 0", () => {
    const plan = createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 0 });

    expect(formatRefreshStatus(plan)).toBe("5/5");
  });
});
