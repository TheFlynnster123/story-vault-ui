import { describe, it, expect } from "vitest";
import { OpenRouterError, parseOpenRouterError } from "./OpenRouterError";

describe("OpenRouterError", () => {
  // ---- Constructor / User-Friendly Messages ----

  describe("user-friendly messages", () => {
    it("should produce an auth message for 401", () => {
      const error = new OpenRouterError(401, "Invalid key");
      expect(error.message).toContain("invalid or expired");
      expect(error.code).toBe(401);
      expect(error.apiMessage).toBe("Invalid key");
    });

    it("should produce a credits message for 402", () => {
      const error = new OpenRouterError(402, "Insufficient credits");
      expect(error.message).toContain("Insufficient OpenRouter credits");
    });

    it("should include moderation reasons for 403 with metadata", () => {
      const error = new OpenRouterError(403, "Flagged", {
        reasons: ["violence", "hate"],
        flagged_input: "some text",
        provider_name: "OpenAI",
        model_slug: "gpt-4",
      });
      expect(error.message).toContain("violence");
      expect(error.message).toContain("hate");
    });

    it("should fall back to generic moderation message for 403 without reasons", () => {
      const error = new OpenRouterError(403, "Flagged by moderation");
      expect(error.message).toContain("Content moderation error");
    });

    it("should produce a timeout message for 408", () => {
      const error = new OpenRouterError(408, "Timeout");
      expect(error.message).toContain("timed out");
    });

    it("should produce a rate-limit message for 429", () => {
      const error = new OpenRouterError(429, "Rate limited");
      expect(error.message).toContain("Rate limit exceeded");
    });

    it("should produce a model-down message for 502", () => {
      const error = new OpenRouterError(502, "Bad gateway");
      expect(error.message).toContain("currently unavailable");
    });

    it("should produce a no-provider message for 503", () => {
      const error = new OpenRouterError(503, "No providers");
      expect(error.message).toContain("No provider");
    });

    it("should use the API message for unknown codes", () => {
      const error = new OpenRouterError(418, "I'm a teapot");
      expect(error.message).toBe("I'm a teapot");
    });

    it("should fall back to a generic message for unknown codes with no message", () => {
      const error = new OpenRouterError(500, "");
      expect(error.message).toContain("Unexpected error (500)");
    });
  });

  describe("error identity", () => {
    it("should be an instance of Error", () => {
      const error = new OpenRouterError(400, "bad");
      expect(error).toBeInstanceOf(Error);
    });

    it("should have name OpenRouterError", () => {
      const error = new OpenRouterError(400, "bad");
      expect(error.name).toBe("OpenRouterError");
    });

    it("should preserve metadata", () => {
      const meta = { provider_name: "Anthropic", raw: { detail: "oops" } };
      const error = new OpenRouterError(502, "fail", meta);
      expect(error.metadata).toEqual(meta);
    });
  });
});

describe("parseOpenRouterError", () => {
  it("should parse a standard OpenRouter error body", () => {
    const body = JSON.stringify({
      error: { code: 429, message: "Rate limit exceeded" },
    });

    const result = parseOpenRouterError(429, body);

    expect(result).toBeInstanceOf(OpenRouterError);
    expect(result!.code).toBe(429);
    expect(result!.apiMessage).toBe("Rate limit exceeded");
  });

  it("should parse error body with metadata", () => {
    const body = JSON.stringify({
      error: {
        code: 403,
        message: "Flagged",
        metadata: {
          reasons: ["violence"],
          flagged_input: "bad text",
          provider_name: "OpenAI",
          model_slug: "gpt-4",
        },
      },
    });

    const result = parseOpenRouterError(403, body);

    expect(result).toBeInstanceOf(OpenRouterError);
    expect(result!.metadata?.reasons).toEqual(["violence"]);
  });

  it("should use HTTP status when error.code is not a number", () => {
    const body = JSON.stringify({
      error: { code: "server_error", message: "Something broke" },
    });

    const result = parseOpenRouterError(502, body);

    expect(result!.code).toBe(502);
  });

  it("should return undefined for non-JSON body", () => {
    const result = parseOpenRouterError(500, "Internal Server Error");
    expect(result).toBeUndefined();
  });

  it("should return undefined when body has no error field", () => {
    const body = JSON.stringify({ reply: "hello" });
    const result = parseOpenRouterError(200, body);
    expect(result).toBeUndefined();
  });

  it("should return undefined for empty body", () => {
    const result = parseOpenRouterError(500, "");
    expect(result).toBeUndefined();
  });
});
