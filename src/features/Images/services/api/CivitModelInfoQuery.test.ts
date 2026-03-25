import { describe, it, expect, vi, beforeEach } from "vitest";
import { CivitModelInfoQuery } from "./CivitModelInfoQuery";
import type { CivitModelInfo } from "./CivitModelInfoQuery";

describe("CivitModelInfoQuery", () => {
  let query: CivitModelInfoQuery;

  beforeEach(() => {
    query = new CivitModelInfoQuery();
    vi.restoreAllMocks();
  });

  describe("extractPreview", () => {
    it("should return the first image from the latest model version", () => {
      const modelInfo: CivitModelInfo = {
        modelVersions: [
          {
            images: [
              { url: "https://example.com/image1.jpg", type: "image" },
              { url: "https://example.com/image2.jpg", type: "image" },
            ],
          },
          {
            images: [
              { url: "https://example.com/old-image.jpg", type: "image" },
            ],
          },
        ],
      };

      const result = query.extractPreview(modelInfo);

      expect(result).toEqual({
        url: "https://example.com/image1.jpg",
        type: "image",
      });
    });

    it("should return video type when first image is a video", () => {
      const modelInfo: CivitModelInfo = {
        modelVersions: [
          {
            images: [{ url: "https://example.com/preview.mp4", type: "video" }],
          },
        ],
      };

      const result = query.extractPreview(modelInfo);

      expect(result).toEqual({
        url: "https://example.com/preview.mp4",
        type: "video",
      });
    });

    it("should return undefined when modelInfo is undefined", () => {
      expect(query.extractPreview(undefined)).toBeUndefined();
    });

    it("should return undefined when modelVersions is empty", () => {
      expect(query.extractPreview({ modelVersions: [] })).toBeUndefined();
    });

    it("should return undefined when latest version has no images", () => {
      expect(
        query.extractPreview({ modelVersions: [{ images: [] }] }),
      ).toBeUndefined();
    });
  });

  describe("GetPreview", () => {
    it("should fetch and return preview for a valid model ID", async () => {
      const mockModelInfo: CivitModelInfo = {
        modelVersions: [
          {
            images: [{ url: "https://example.com/preview.jpg", type: "image" }],
          },
        ],
      };

      vi.spyOn(query, "fetchModelInfo").mockResolvedValue(mockModelInfo);

      const result = await query.GetPreview(123456);

      expect(result).toEqual({
        url: "https://example.com/preview.jpg",
        type: "image",
      });
      expect(query.fetchModelInfo).toHaveBeenCalledWith(123456);
    });

    it("should return undefined when fetch fails", async () => {
      vi.spyOn(query, "fetchModelInfo").mockRejectedValue(
        new Error("Network error"),
      );

      const result = await query.GetPreview(123456);

      expect(result).toBeUndefined();
    });

    it("should return undefined when model has no preview images", async () => {
      vi.spyOn(query, "fetchModelInfo").mockResolvedValue({
        modelVersions: [],
      });

      const result = await query.GetPreview(123456);

      expect(result).toBeUndefined();
    });
  });
});
