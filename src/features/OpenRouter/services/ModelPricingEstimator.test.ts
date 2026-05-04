import { describe, it, expect } from "vitest";
import { ModelPricingEstimator } from "./ModelPricingEstimator";
import type { OpenRouterModel } from "./OpenRouterModelsAPI";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeModel = (
  id: string,
  pricing?: Partial<{ prompt: string; completion: string }>,
): OpenRouterModel => ({
  id,
  name: id,
  pricing: pricing as OpenRouterModel["pricing"],
});

const makeEstimator = (models: OpenRouterModel[]): ModelPricingEstimator =>
  new ModelPricingEstimator(() => models);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ModelPricingEstimator", () => {
  // ---- Guard conditions ----

  describe("when modelId is undefined", () => {
    it("returns null", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      expect(estimator.estimateCost(undefined, 1000, 200)).toBeNull();
    });
  });

  describe("when the models list is empty", () => {
    it("returns null", () => {
      const estimator = makeEstimator([]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });
  });

  describe("when the model is not found", () => {
    it("returns null when no model matches the ID", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      expect(
        estimator.estimateCost("anthropic/claude-3", 1000, 200),
      ).toBeNull();
    });

    it("performs case-sensitive ID matching", () => {
      const estimator = makeEstimator([
        makeModel("openai/GPT-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });
  });

  describe("when the model has no pricing", () => {
    it("returns null when pricing is absent", () => {
      const estimator = makeEstimator([makeModel("openai/gpt-4o")]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when pricing object is undefined", () => {
      const model: OpenRouterModel = {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        pricing: undefined,
      };
      const estimator = makeEstimator([model]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });
  });

  describe("when pricing fields are missing or invalid", () => {
    it("returns null when prompt rate is missing", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { completion: "0.000015" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when completion rate is missing", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "0.000005" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when prompt rate is an empty string", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "", completion: "0.000015" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when completion rate is an empty string", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "0.000005", completion: "" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when prompt rate is non-numeric", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "free", completion: "0.000015" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });

    it("returns null when completion rate is non-numeric", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "0.000005", completion: "N/A" }),
      ]);
      expect(estimator.estimateCost("openai/gpt-4o", 1000, 200)).toBeNull();
    });
  });

  // ---- Free models (pricing = "0") ----

  describe("free models with pricing '0'", () => {
    it("returns zero costs (not null) when both rates are '0'", () => {
      const estimator = makeEstimator([
        makeModel("meta-llama/llama-3.2-1b", { prompt: "0", completion: "0" }),
      ]);
      const result = estimator.estimateCost(
        "meta-llama/llama-3.2-1b",
        4000,
        800,
      );
      expect(result).not.toBeNull();
      expect(result!.inputCost).toBe(0);
      expect(result!.outputCost).toBe(0);
      expect(result!.totalCost).toBe(0);
    });

    it("returns zero input cost when only prompt rate is '0'", () => {
      const estimator = makeEstimator([
        makeModel("some/model", { prompt: "0", completion: "0.000005" }),
      ]);
      const result = estimator.estimateCost("some/model", 4000, 800);
      expect(result!.inputCost).toBe(0);
      expect(result!.outputCost).toBeGreaterThan(0);
    });
  });

  // ---- Token calculation ----

  describe("token estimation (4 chars per token)", () => {
    it("computes 1 token from 4 chars", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "1", completion: "1" }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 4, 0);
      expect(result!.inputTokens).toBe(1);
      expect(result!.outputTokens).toBe(0);
    });

    it("computes 1000 tokens from 4000 chars", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 4000, 4000);
      expect(result!.inputTokens).toBe(1000);
      expect(result!.outputTokens).toBe(1000);
    });

    it("handles fractional tokens for non-divisible char counts", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", { prompt: "1", completion: "1" }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 5, 0);
      expect(result!.inputTokens).toBe(1.25);
    });

    it("returns zero tokens and costs when both char counts are zero", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 0, 0);
      expect(result!.inputTokens).toBe(0);
      expect(result!.outputTokens).toBe(0);
      expect(result!.inputCost).toBe(0);
      expect(result!.outputCost).toBe(0);
      expect(result!.totalCost).toBe(0);
    });
  });

  // ---- Cost calculation ----

  describe("cost calculation", () => {
    it("computes correct input cost", () => {
      // 4000 chars → 1000 tokens × $0.000005 = $0.005
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 4000, 0);
      expect(result!.inputCost).toBeCloseTo(0.005, 10);
    });

    it("computes correct output cost", () => {
      // 800 chars → 200 tokens × $0.000015 = $0.003
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 0, 800);
      expect(result!.outputCost).toBeCloseTo(0.003, 10);
    });

    it("totalCost is the sum of inputCost and outputCost", () => {
      const estimator = makeEstimator([
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4o", 4000, 800);
      expect(result!.totalCost).toBeCloseTo(
        result!.inputCost + result!.outputCost,
        10,
      );
    });

    it("handles very low pricing rates (real-world: qwen at $0.0000004 / token)", () => {
      // 1M chars → 250k tokens × $0.0000004 = $0.10
      const estimator = makeEstimator([
        makeModel("qwen/qwen3.5-plus-20260420", {
          prompt: "0.0000004",
          completion: "0.0000024",
        }),
      ]);
      const result = estimator.estimateCost(
        "qwen/qwen3.5-plus-20260420",
        1_000_000,
        0,
      );
      expect(result!.inputCost).toBeCloseTo(0.1, 8);
    });

    it("handles large input and output together (full context window scenario)", () => {
      // 1M chars in, 200k chars out with qwen pricing
      const estimator = makeEstimator([
        makeModel("qwen/qwen3.5-plus-20260420", {
          prompt: "0.0000004",
          completion: "0.0000024",
        }),
      ]);
      const result = estimator.estimateCost(
        "qwen/qwen3.5-plus-20260420",
        1_000_000,
        200_000,
      );
      // inputTokens = 250000, outputTokens = 50000
      // inputCost = 250000 × 0.0000004 = 0.10
      // outputCost = 50000 × 0.0000024 = 0.12
      expect(result!.inputCost).toBeCloseTo(0.1, 8);
      expect(result!.outputCost).toBeCloseTo(0.12, 8);
      expect(result!.totalCost).toBeCloseTo(0.22, 8);
    });

    it("handles expensive models (e.g. GPT-4.5 at $0.075 / token)", () => {
      // 400 chars → 100 tokens × $0.075 = $7.50
      const estimator = makeEstimator([
        makeModel("openai/gpt-4.5", { prompt: "0.075", completion: "0.15" }),
      ]);
      const result = estimator.estimateCost("openai/gpt-4.5", 400, 0);
      expect(result!.inputCost).toBeCloseTo(7.5, 10);
    });
  });

  // ---- Model selection ----

  describe("model selection from a list", () => {
    const models: OpenRouterModel[] = [
      makeModel("openai/gpt-4o", {
        prompt: "0.000005",
        completion: "0.000015",
      }),
      makeModel("anthropic/claude-3-opus", {
        prompt: "0.000015",
        completion: "0.000075",
      }),
      makeModel("meta-llama/llama-3.2-1b", { prompt: "0", completion: "0" }),
    ];

    it("selects the correct model when multiple models are present", () => {
      const estimator = makeEstimator(models);
      const result = estimator.estimateCost(
        "anthropic/claude-3-opus",
        4000,
        800,
      );
      // 1000 tokens × $0.000015 + 200 tokens × $0.000075
      expect(result!.inputCost).toBeCloseTo(0.015, 10);
      expect(result!.outputCost).toBeCloseTo(0.015, 10);
    });

    it("returns null for an unknown model even when other models exist", () => {
      const estimator = makeEstimator(models);
      expect(estimator.estimateCost("google/gemini-pro", 4000, 800)).toBeNull();
    });

    it("uses the first matching model when IDs are unique", () => {
      const estimator = makeEstimator(models);
      const gpt4oResult = estimator.estimateCost("openai/gpt-4o", 4000, 800);
      const llamaResult = estimator.estimateCost(
        "meta-llama/llama-3.2-1b",
        4000,
        800,
      );
      expect(gpt4oResult!.inputCost).toBeCloseTo(0.005, 10);
      expect(llamaResult!.totalCost).toBe(0);
    });
  });

  // ---- Provider re-read ----

  describe("models provider is read on each call", () => {
    it("reflects updated model list without recreating the estimator", () => {
      let models: OpenRouterModel[] = [];
      const estimator = new ModelPricingEstimator(() => models);

      // Models not loaded yet → null
      expect(estimator.estimateCost("openai/gpt-4o", 4000, 800)).toBeNull();

      // Simulate cache population
      models = [
        makeModel("openai/gpt-4o", {
          prompt: "0.000005",
          completion: "0.000015",
        }),
      ];

      // Now should resolve
      const result = estimator.estimateCost("openai/gpt-4o", 4000, 800);
      expect(result).not.toBeNull();
      expect(result!.inputCost).toBeCloseTo(0.005, 10);
    });
  });
});
