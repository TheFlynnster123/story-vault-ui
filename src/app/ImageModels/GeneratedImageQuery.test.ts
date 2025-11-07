import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratedImageQuery } from "./GeneratedImageQuery";
import type { GeneratedImage } from "./GeneratedImage";

// Mock global fetch
global.fetch = vi.fn();

// Mock dependencies
const mockLog = vi.fn();

vi.mock("../Dependencies/Dependencies", () => ({
  d: {
    ErrorService: vi.fn(() => ({
      log: mockLog,
    })),
  },
}));

describe("GeneratedImageQuery", () => {
  let query: GeneratedImageQuery;
  let mockFetch: any;

  const createMockGeneratedImage = (): GeneratedImage => ({
    type: "image",
    remixOf: { id: 12345 },
    resources: [],
    params: {
      prompt: "test prompt",
      negativePrompt: "test negative",
      cfgScale: 7.5,
      steps: 20,
      sampler: "DPM++ 2M",
      width: 512,
      height: 768,
      aspectRatio: "2:3",
      clipSkip: 1,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    query = new GeneratedImageQuery();
    mockFetch = global.fetch as any;
  });

  describe("API Integration", () => {
    it("should build correct API URL", () => {
      const imageId = "12345";
      const url = query.buildApiUrl(imageId);

      expect(url).toBe(
        "https://civitai.com/api/generation/data?type=image&id=12345"
      );
    });

    it("should make successful API request", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await query.makeApiRequest("https://example.com");

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should return null and log error on failed API request", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await query.makeApiRequest("https://example.com");

      expect(result).toBeNull();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to fetch image data: 500 Internal Server Error",
        expect.any(Error)
      );
    });

    it("should parse response successfully", async () => {
      const mockData = createMockGeneratedImage();
      const mockResponse = {
        json: vi.fn().mockResolvedValue(mockData),
      } as any;

      const result = await query.parseResponse(mockResponse);

      expect(result).toEqual(mockData);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it("should return null and log error on parse failure", async () => {
      const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error("Parse error")),
      } as any;

      const result = await query.parseResponse(mockResponse);

      expect(result).toBeNull();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to parse response",
        expect.any(Error)
      );
    });
  });

  describe("Get", () => {
    it("should complete full image query flow", async () => {
      const mockGeneratedImage = createMockGeneratedImage();
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockGeneratedImage),
      });

      const result = await query.Get("12345");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://civitai.com/api/generation/data?type=image&id=12345",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockGeneratedImage);
    });

    it("should return undefined and log error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await query.Get("12345");

      expect(result).toBeUndefined();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to generate image model",
        expect.any(Error)
      );
    });

    it("should return undefined and log error on parse failure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Parse error")),
      });

      const result = await query.Get("12345");

      expect(result).toBeUndefined();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to generate image model",
        expect.any(Error)
      );
    });
  });
});
