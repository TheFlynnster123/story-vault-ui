import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StoryVaultAPI,
  type IStoryVaultAPI,
} from "../../clients/StoryVaultAPI";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("StoryVaultAPI", () => {
  let storyVaultAPI: StoryVaultAPI;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.resetAllMocks();
    storyVaultAPI = new StoryVaultAPI(mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(storyVaultAPI).toBeInstanceOf(StoryVaultAPI);
      expect(storyVaultAPI.AccessToken).toBe(mockAccessToken);
      expect(storyVaultAPI.URL).toBe("https://test-api.com");
    });

    it("should implement IStoryVaultAPI interface", () => {
      const api: IStoryVaultAPI = storyVaultAPI;
      expect(api).toBeDefined();
      expect(typeof api.hasValidGrokKey).toBe("function");
    });

    it("should throw error when access token is missing", () => {
      expect(() => {
        new StoryVaultAPI("");
      }).toThrow("Access token is required");
    });

    it("should throw error when access token is null", () => {
      expect(() => {
        new StoryVaultAPI(null as any);
      }).toThrow("Access token is required");
    });

    it("should throw error when access token is undefined", () => {
      expect(() => {
        new StoryVaultAPI(undefined as any);
      }).toThrow("Access token is required");
    });
  });

  describe("hasValidGrokKey", () => {
    it("should return true when response status is 200", async () => {
      const mockResponse = {
        status: 200,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await storyVaultAPI.hasValidGrokKey();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/hasValidGrokKey",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
        }
      );
    });

    it("should return false when response status is 404", async () => {
      const mockResponse = {
        status: 404,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await storyVaultAPI.hasValidGrokKey();

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/hasValidGrokKey",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
        }
      );
    });

    it("should throw error for unexpected response status", async () => {
      const mockResponse = {
        status: 500,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow(
        "Unexpected response status: 500"
      );
    });

    it("should throw error for 401 Unauthorized", async () => {
      const mockResponse = {
        status: 401,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow(
        "Unexpected response status: 401"
      );
    });

    it("should throw error for 403 Forbidden", async () => {
      const mockResponse = {
        status: 403,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow(
        "Unexpected response status: 403"
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle fetch timeout", async () => {
      const timeoutError = new Error("Request timeout");
      (global.fetch as any).mockRejectedValue(timeoutError);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow(
        "Request timeout"
      );
    });
  });

  describe("saveGrokKey", () => {
    it("should successfully save Grok key when response status is 201", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/saveGrokKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ grokKey: "encrypted-grok-key" }),
        }
      );
    });

    it("should throw error when response status is not 201", async () => {
      const mockResponse = {
        status: 400,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).rejects.toThrow("Failed to save Grok key: 400");
    });

    it("should throw error for 401 Unauthorized", async () => {
      const mockResponse = {
        status: 401,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).rejects.toThrow("Failed to save Grok key: 401");
    });

    it("should throw error for 403 Forbidden", async () => {
      const mockResponse = {
        status: 403,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).rejects.toThrow("Failed to save Grok key: 403");
    });

    it("should throw error for 500 Internal Server Error", async () => {
      const mockResponse = {
        status: 500,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).rejects.toThrow("Failed to save Grok key: 500");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        storyVaultAPI.saveGrokKey("encrypted-grok-key")
      ).rejects.toThrow("Network error");
    });

    it("should handle empty Grok key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.saveGrokKey("")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/saveGrokKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ grokKey: "" }),
        }
      );
    });

    it("should handle special characters in Grok key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const specialKey = "encrypted-key-with-special-chars!@#$%^&*()";
      await expect(
        storyVaultAPI.saveGrokKey(specialKey)
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/saveGrokKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ grokKey: specialKey }),
        }
      );
    });

    it("should handle very long Grok key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const longKey = "a".repeat(1000);
      await expect(storyVaultAPI.saveGrokKey(longKey)).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/saveGrokKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ grokKey: longKey }),
        }
      );
    });
  });

  describe("request building", () => {
    it("should build correct headers for hasValidGrokKey", async () => {
      const mockResponse = { status: 200 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await storyVaultAPI.hasValidGrokKey();

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers.Authorization).toBe(
        "Bearer test-access-token"
      );
      expect(callArgs[1].method).toBe("GET");
    });

    it("should build correct headers for saveGrokKey", async () => {
      const mockResponse = { status: 201 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await storyVaultAPI.saveGrokKey("test-key");

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers.Authorization).toBe(
        "Bearer test-access-token"
      );
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBe(JSON.stringify({ grokKey: "test-key" }));
    });

    it("should use correct URLs", async () => {
      const mockResponse = { status: 200 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await storyVaultAPI.hasValidGrokKey();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/hasValidGrokKey",
        expect.any(Object)
      );

      const mockResponse2 = { status: 201 };
      (global.fetch as any).mockResolvedValue(mockResponse2);

      await storyVaultAPI.saveGrokKey("test-key");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/saveGrokKey",
        expect.any(Object)
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null response from fetch", async () => {
      (global.fetch as any).mockResolvedValue(null);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow();
    });

    it("should handle undefined response status", async () => {
      const mockResponse = {
        status: undefined,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow();
    });

    it("should handle response with no status property", async () => {
      const mockResponse = {};

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(storyVaultAPI.hasValidGrokKey()).rejects.toThrow();
    });
  });
});
