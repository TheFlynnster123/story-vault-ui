import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenRouterModelsAPI } from "./OpenRouterModelsAPI";

describe("OpenRouterModelsAPI", () => {
  let api: OpenRouterModelsAPI;

  beforeEach(() => {
    api = new OpenRouterModelsAPI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getModels", () => {
    it("should return parsed models on success", async () => {
      const responseData = {
        data: [
          { id: "openai/gpt-4", name: "GPT-4" },
          { id: "anthropic/claude-3", name: "Claude 3" },
        ],
      };

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify(responseData), { status: 200 }),
      );

      const models = await api.getModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe("openai/gpt-4");
      expect(models[1].name).toBe("Claude 3");
    });

    it("should throw on non-ok response", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response("Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      await expect(api.getModels()).rejects.toThrow(
        "Failed to fetch OpenRouter models: 500 Internal Server Error",
      );
    });

    it("should call the correct endpoint", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );

      await api.getModels();

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/models?output_modalities=text",
      );
    });
  });
});
