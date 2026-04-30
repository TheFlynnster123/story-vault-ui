import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenRouterChatAPI, cleanMessages } from "./OpenRouterChatAPI";
import { OpenRouterError } from "./OpenRouterError";
import { d } from "../../../services/Dependencies";
import { getOpenRouterCreditsQueryKey } from "./OpenRouterCreditsAPI";

vi.mock("../../../services/Dependencies");

describe("OpenRouterChatAPI", () => {
  let api: OpenRouterChatAPI;
  let invalidateQueries: ReturnType<typeof vi.fn>;

  const mockAccessToken = "test-token";
  const mockEncryptionKey = "enc-key-123";

  beforeEach(() => {
    api = new OpenRouterChatAPI();
    (api as any).API_URL = "https://test-api.example.com";
    invalidateQueries = vi.fn().mockResolvedValue(undefined);

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

    vi.mocked(d.QueryClient).mockReturnValue({
      invalidateQueries,
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

      const result = await api.postChat([{ role: "user", content: "Hi" }]);

      expect(result).toBe("Hello world");
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getOpenRouterCreditsQueryKey(),
      });
    });

    it("should refresh credits after a streamed response completes", async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: "Hello"\n'));
          controller.enqueue(encoder.encode('data: " world"\n'));
          controller.enqueue(encoder.encode("data: [DONE]\n"));
          controller.close();
        },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(stream, { status: 200 }),
      );

      const onToken = vi.fn();

      const result = await api.postChatStream(
        [{ role: "user", content: "Hi" }],
        onToken,
      );

      expect(result).toBe("Hello world");
      expect(onToken).toHaveBeenLastCalledWith("Hello world");
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getOpenRouterCreditsQueryKey(),
      });
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

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("should throw OpenRouterError for a 402 response", async () => {
      const errorBody = JSON.stringify({
        error: { code: 402, message: "Insufficient credits" },
      });

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(errorBody, {
          status: 402,
          statusText: "Payment Required",
        }),
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
        new Response(errorBody, {
          status: 429,
          statusText: "Too Many Requests",
        }),
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
        new Response(errorBody, {
          status: 429,
          statusText: "Too Many Requests",
        }),
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
      vi.spyOn(global, "fetch").mockRejectedValue(
        new TypeError("Failed to fetch"),
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

  // ---- Message Cleaning ----

  describe("message cleaning", () => {
    it("should only send role and content fields in the request body", async () => {
      const responseBody = { reply: "ok" };
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify(responseBody), { status: 200 }),
        );

      const dirtyMessages = [
        {
          id: "book-123",
          role: "system" as const,
          content: "Book summary",
        },
        {
          id: "user-456",
          role: "user" as const,
          content: "Hello",
        },
      ];

      await api.postChat(dirtyMessages);

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      for (const msg of sentBody.messages) {
        expect(Object.keys(msg)).toEqual(["role", "content"]);
      }
    });
  });
});

// ---- cleanMessages ----

describe("cleanMessages", () => {
  it("should strip extra fields and keep only role and content", () => {
    const messages = [
      { id: "book-123", role: "system" as const, content: "Summary" },
      { id: "user-456", role: "user" as const, content: "Hello" },
      { id: "asst-789", role: "assistant" as const, content: "Response" },
    ];

    const result = cleanMessages(messages);

    expect(result).toEqual([
      { role: "system", content: "Summary" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Response" },
    ]);
  });

  it("should return an empty array for empty input", () => {
    expect(cleanMessages([])).toEqual([]);
  });

  it("should not include any unexpected properties", () => {
    const messages = [
      {
        id: "msg-1",
        role: "user" as const,
        content: "Hi",
        extra: "should be removed",
      } as any,
    ];

    const result = cleanMessages(messages);

    expect(result).toEqual([{ role: "user", content: "Hi" }]);
    expect(result[0]).not.toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("extra");
  });
});
