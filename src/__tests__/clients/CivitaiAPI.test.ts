import { describe, it, expect, vi, beforeEach } from "vitest";
import { CivitaiAPI, type ICivitaiAPI } from "../../clients/CivitaiAPI";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("CivitaiAPI", () => {
  let civitaiAPI: CivitaiAPI;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.resetAllMocks();
    civitaiAPI = new CivitaiAPI(mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(civitaiAPI).toBeInstanceOf(CivitaiAPI);
      expect(civitaiAPI.AccessToken).toBe(mockAccessToken);
      expect(civitaiAPI.URL).toBe("https://test-api.com");
    });

    it("should implement ICivitaiAPI interface", () => {
      const api: ICivitaiAPI = civitaiAPI;
      expect(api).toBeDefined();
      expect(typeof api.hasValidCivitaiKey).toBe("function");
      expect(typeof api.saveCivitaiKey).toBe("function");
    });

    it("should throw error when access token is missing", () => {
      expect(() => {
        new CivitaiAPI("");
      }).toThrow("Access token is required");
    });

    it("should throw error when access token is null", () => {
      expect(() => {
        new CivitaiAPI(null as any);
      }).toThrow("Access token is required");
    });

    it("should throw error when access token is undefined", () => {
      expect(() => {
        new CivitaiAPI(undefined as any);
      }).toThrow("Access token is required");
    });
  });

  describe("hasValidCivitaiKey", () => {
    it("should return true when response status is 200", async () => {
      const mockResponse = {
        status: 200,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await civitaiAPI.hasValidCivitaiKey();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/HasValidCivitaiKey",
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

      const result = await civitaiAPI.hasValidCivitaiKey();

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/HasValidCivitaiKey",
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

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow(
        "Unexpected response status: 500"
      );
    });

    it("should throw error for 401 Unauthorized", async () => {
      const mockResponse = {
        status: 401,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow(
        "Unexpected response status: 401"
      );
    });

    it("should throw error for 403 Forbidden", async () => {
      const mockResponse = {
        status: 403,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow(
        "Unexpected response status: 403"
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle fetch timeout", async () => {
      const timeoutError = new Error("Request timeout");
      (global.fetch as any).mockRejectedValue(timeoutError);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow(
        "Request timeout"
      );
    });
  });

  describe("saveCivitaiKey", () => {
    it("should successfully save Civitai key when response status is 201", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveCivitaiKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ civitaiKey: "encrypted-civitai-key" }),
        }
      );
    });

    it("should throw error when response status is not 201", async () => {
      const mockResponse = {
        status: 400,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).rejects.toThrow("Failed to save Civitai key: 400");
    });

    it("should throw error for 401 Unauthorized", async () => {
      const mockResponse = {
        status: 401,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).rejects.toThrow("Failed to save Civitai key: 401");
    });

    it("should throw error for 403 Forbidden", async () => {
      const mockResponse = {
        status: 403,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).rejects.toThrow("Failed to save Civitai key: 403");
    });

    it("should throw error for 500 Internal Server Error", async () => {
      const mockResponse = {
        status: 500,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).rejects.toThrow("Failed to save Civitai key: 500");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        civitaiAPI.saveCivitaiKey("encrypted-civitai-key")
      ).rejects.toThrow("Network error");
    });

    it("should handle empty Civitai key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(civitaiAPI.saveCivitaiKey("")).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveCivitaiKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ civitaiKey: "" }),
        }
      );
    });

    it("should handle special characters in Civitai key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const specialKey = "encrypted-key-with-special-chars!@#$%^&*()";
      await expect(
        civitaiAPI.saveCivitaiKey(specialKey)
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveCivitaiKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ civitaiKey: specialKey }),
        }
      );
    });

    it("should handle very long Civitai key", async () => {
      const mockResponse = {
        status: 201,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const longKey = "a".repeat(1000);
      await expect(civitaiAPI.saveCivitaiKey(longKey)).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveCivitaiKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ civitaiKey: longKey }),
        }
      );
    });
  });

  describe("request building", () => {
    it("should build correct headers for hasValidCivitaiKey", async () => {
      const mockResponse = { status: 200 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await civitaiAPI.hasValidCivitaiKey();

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers.Authorization).toBe(
        "Bearer test-access-token"
      );
      expect(callArgs[1].method).toBe("GET");
    });

    it("should build correct headers for saveCivitaiKey", async () => {
      const mockResponse = { status: 201 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await civitaiAPI.saveCivitaiKey("test-key");

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers.Authorization).toBe(
        "Bearer test-access-token"
      );
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBe(JSON.stringify({ civitaiKey: "test-key" }));
    });

    it("should use correct URLs", async () => {
      const mockResponse = { status: 200 };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await civitaiAPI.hasValidCivitaiKey();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/HasValidCivitaiKey",
        expect.any(Object)
      );

      const mockResponse2 = { status: 201 };
      (global.fetch as any).mockResolvedValue(mockResponse2);

      await civitaiAPI.saveCivitaiKey("test-key");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveCivitaiKey",
        expect.any(Object)
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null response from fetch", async () => {
      (global.fetch as any).mockResolvedValue(null);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow();
    });

    it("should handle undefined response status", async () => {
      const mockResponse = {
        status: undefined,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow();
    });

    it("should handle response with no status property", async () => {
      const mockResponse = {};

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(civitaiAPI.hasValidCivitaiKey()).rejects.toThrow();
    });
  });
});
