import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenRouterChatAPI } from "./OpenRouterChatAPI";
import { OpenRouterError } from "./OpenRouterError";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

describe("OpenRouterChatAPI", () => {
  let api: OpenRouterChatAPI;

  const mockAccessToken = "test-token";
  const mockEncryptionKey = "enc-key-123";

  beforeEach(() => {
    api = new OpenRouterChatAPI();
    (api as any).API_URL = "https://test-api.example.com";

    vi.mocked(d.AuthAPI).mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue(mockAccessToken),
    } as any);

    vi.mocked(d.EncryptionManager).mockReturnValue({
      getOpenRouterEncryptionKey: vi.fn().mockResolvedValue(mockEncryptionKey),
    } as any);

    vi.mocked(d.SystemSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({}),
    } as any);

    vi.mocked(d.ErrorService).mockReturnValue({
      log: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Success ----

  describe("successful requests", () => {
    it("should return parsed JSON on success", async () => {
      const responseBody = { reply: "Hello world" };
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify(responseBody), { status: 200 }),
      );

      const result = await api.postChat([
        { role: "user", content: "Hi" },
      ]);

      expect(result).toBe("Hello world");
    });
  });

  // ---- OpenRouter Error Responses ----

  describe("OpenRouter error responses", () => {
    it("should throw OpenRouterError for a 401 response", async () => {
      const errorBody = JSON.stringify({
        error: { code: 401, message: "Invalid API key" },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, { status: 401, statusText: "Unauthorized" }),
      );

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OpenRouterError);
        expect((e as OpenRouterError).code).toBe(401);
      }
    });

    it("should throw OpenRouterError for a 402 response", async () => {
      const errorBody = JSON.stringify({
        error: { code: 402, message: "Insufficient credits" },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, { status: 402, statusText: "Payment Required" }),
      );

      await expect(
        api.postChat([{ role: "user", content: "Hi" }]),
      ).rejects.toThrow(OpenRouterError);
    });

    it("should throw OpenRouterError for a 429 response with rate limit details", async () => {
      const errorBody = JSON.stringify({
        error: { code: 429, message: "Rate limit exceeded" },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, { status: 429, statusText: "Too Many Requests" }),
      );

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OpenRouterError);
        expect((e as OpenRouterError).code).toBe(429);
      }
    });

    it("should throw OpenRouterError for a 403 with moderation metadata", async () => {
      const errorBody = JSON.stringify({
        error: {
          code: 403,
          message: "Input flagged",
          metadata: {
            reasons: ["violence"],
            flagged_input: "bad content",
            provider_name: "OpenAI",
            model_slug: "gpt-4",
          },
        },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, { status: 403, statusText: "Forbidden" }),
      );

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OpenRouterError);
        const err = e as OpenRouterError;
        expect(err.code).toBe(403);
        expect(err.metadata?.reasons).toEqual(["violence"]);
        expect(err.message).toContain("violence");
      }
    });

    it("should fall back to a generic OpenRouterError for non-JSON error responses", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OpenRouterError);
        expect((e as OpenRouterError).code).toBe(500);
      }
    });
  });

  // ---- Notification ----

  describe("error notifications", () => {
    it("should call ErrorService.log exactly once for API errors", async () => {
      const errorBody = JSON.stringify({
        error: { code: 429, message: "Rate limit exceeded" },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, { status: 429, statusText: "Too Many Requests" }),
      );

      const mockLog = vi.fn();
      vi.mocked(d.ErrorService).mockReturnValue({ log: mockLog } as any);

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
      } catch {
        // expected
      }

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining("Rate limit"),
        expect.any(OpenRouterError),
      );
    });

    it("should call ErrorService.log with network message for fetch failures", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

      const mockLog = vi.fn();
      vi.mocked(d.ErrorService).mockReturnValue({ log: mockLog } as any);

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
      } catch {
        // expected
      }

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining("Network error"),
        expect.any(TypeError),
      );
    });
  });

  // ---- Network Errors ----

  describe("network errors", () => {
    it("should throw OpenRouterError with code 0 for network failures", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(
        new TypeError("Failed to fetch"),
      );

      try {
        await api.postChat([{ role: "user", content: "Hi" }]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OpenRouterError);
        expect((e as OpenRouterError).code).toBe(0);
      }
    });
  });
});
