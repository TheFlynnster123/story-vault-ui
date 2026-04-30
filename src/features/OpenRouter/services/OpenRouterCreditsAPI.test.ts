import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenRouterCreditsAPI } from "./OpenRouterCreditsAPI";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

describe("OpenRouterCreditsAPI", () => {
  let api: OpenRouterCreditsAPI;

  const mockAccessToken = "test-token";
  const mockEncryptionKey = "encrypted-key-value";

  beforeEach(() => {
    api = new OpenRouterCreditsAPI();
    (api as any).URL = "https://test-api.example.com";

    vi.mocked(d.AuthAPI).mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue(mockAccessToken),
    } as any);

    vi.mocked(d.EncryptionManager).mockReturnValue({
      getOpenRouterEncryptionKey: vi.fn().mockResolvedValue(mockEncryptionKey),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return parsed credits on success", async () => {
    const rawResponse = {
      data: {
        label: "Story Vault",
        limit_remaining: 12.34,
        usage: 5.25,
        usage_daily: 1.5,
        usage_weekly: 3.75,
        usage_monthly: 4.5,
        limit: 50,
        limit_reset: "weekly",
        is_free_tier: false,
      },
    };

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(rawResponse), { status: 200 }),
    );

    const result = await api.getCredits();

    expect(result).toEqual({
      limitRemaining: 12.34,
      usage: 5.25,
      usageDaily: 1.5,
      usageWeekly: 3.75,
      usageMonthly: 4.5,
      limit: 50,
      limitReset: "weekly",
      isFreeTier: false,
      label: "Story Vault",
    });
  });

  it("should call the passthrough credits endpoint with app auth header", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            limit_remaining: 1,
            usage: 0,
            usage_daily: 0,
            usage_weekly: 0,
            usage_monthly: 0,
            limit: null,
            limit_reset: null,
            is_free_tier: true,
          },
        }),
        { status: 200 },
      ),
    );

    await api.getCredits();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://test-api.example.com/api/openrouter/auth/key",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockAccessToken}`,
          EncryptionKey: mockEncryptionKey,
        },
      },
    );
  });

  it("should throw on non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(api.getCredits()).rejects.toThrow(
      "Failed to fetch OpenRouter credits: 500 Internal Server Error",
    );
  });
});
