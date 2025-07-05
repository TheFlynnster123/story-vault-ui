import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAPIClient } from "../../clients/BaseAPIClient";
import { EncryptionManager } from "../../Managers/EncryptionManager";

// Mock the config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://story-vault-api.azurewebsites.net",
  },
}));

// Create a concrete implementation for testing
class TestAPIClient extends BaseAPIClient {
  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    super(encryptionManager, accessToken);
  }

  // Expose protected methods for testing
  public testBuildHeaders() {
    return this.buildHeaders();
  }

  public async testMakeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, options);
  }

  public testCreateResponseError(response: Response): Error {
    return this.createResponseError(response);
  }

  public testCreateFetchError(error: any): Error {
    return this.createFetchError(error);
  }
}

describe("BaseAPIClient", () => {
  let client: TestAPIClient;
  let mockEncryptionManager: EncryptionManager;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    // Create a mock EncryptionManager
    mockEncryptionManager = {
      initialize: vi.fn(),
      encryptString: vi.fn(),
      decryptString: vi.fn(),
    } as any;

    client = new TestAPIClient(mockEncryptionManager, mockAccessToken);
    // Reset fetch mock
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with access token", () => {
      expect(client).toBeInstanceOf(BaseAPIClient);
      expect(client).toBeInstanceOf(TestAPIClient);
    });
  });

  describe("buildHeaders", () => {
    it("should build headers with authorization", () => {
      const headers = client.testBuildHeaders();

      expect(headers).toEqual({
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockAccessToken}`,
      });
    });
  });

  describe("makeRequest", () => {
    it("should make successful request and return parsed JSON", async () => {
      const mockResponse = { data: "test data" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });
      global.fetch = mockFetch;

      const result = await client.testMakeRequest<typeof mockResponse>("/data");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://story-vault-api.azurewebsites.net/data",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should make request with custom options", async () => {
      const mockResponse = { success: true };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });
      global.fetch = mockFetch;

      const customOptions: RequestInit = {
        method: "POST",
        body: JSON.stringify({ test: "data" }),
      };

      await client.testMakeRequest<typeof mockResponse>(
        "/create",
        customOptions
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://story-vault-api.azurewebsites.net/create",
        {
          method: "POST",
          body: JSON.stringify({ test: "data" }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }
      );
    });

    it("should throw error for non-ok response", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      await expect(client.testMakeRequest("/notfound")).rejects.toThrow(
        "API request failed: 404 Not Found"
      );
    });

    it("should throw error for fetch failure", async () => {
      const networkError = new Error("Network error");
      const mockFetch = vi.fn().mockRejectedValue(networkError);
      global.fetch = mockFetch;

      await expect(client.testMakeRequest("/data")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("createResponseError", () => {
    it("should create error with response details", () => {
      const mockResponse = {
        status: 500,
        statusText: "Internal Server Error",
      } as Response;

      const error = client.testCreateResponseError(mockResponse);

      expect(error.message).toBe(
        "API request failed: 500 Internal Server Error"
      );
    });
  });

  describe("createFetchError", () => {
    it("should create error with fetch error details", () => {
      const originalError = new Error("Connection timeout");
      const error = client.testCreateFetchError(originalError);

      expect(error.message).toBe("Network error: Connection timeout");
    });

    it("should handle non-Error objects", () => {
      const originalError = "String error";
      const error = client.testCreateFetchError(originalError);

      expect(error.message).toBe("Network error: Unknown error");
    });

    it("should handle undefined error", () => {
      const error = client.testCreateFetchError(undefined);

      expect(error.message).toBe("Network error: Unknown error");
    });
  });

  describe("header merging", () => {
    it("should merge custom headers with default headers", async () => {
      const mockResponse = { data: "test" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });
      global.fetch = mockFetch;

      const customOptions: RequestInit = {
        headers: {
          "X-Custom-Header": "custom-value",
          "Content-Type": "application/xml", // Should be overridden
        },
      };

      await client.testMakeRequest("/data", customOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://story-vault-api.azurewebsites.net/data",
        {
          headers: {
            "X-Custom-Header": "custom-value",
            "Content-Type": "application/xml", // Custom header is preserved
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }
      );
    });
  });
});
