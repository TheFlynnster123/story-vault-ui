import { describe, it, expect, beforeEach } from "vitest";
import { ImageIdExtractor } from "./ImageIdExtractor";

describe("ImageIdExtractor", () => {
  let extractor: ImageIdExtractor;

  beforeEach(() => {
    extractor = new ImageIdExtractor();
  });

  describe("extractImageId", () => {
    it("should extract numeric ID directly", () => {
      const result = extractor.extract("123456789");

      expect(result).toBe("123456789");
    });

    it("should extract ID from API URL with query parameters", () => {
      const result = extractor.extract(
        "https://civitai.com/api/generation/data?type=image&id=123456789"
      );

      expect(result).toBe("123456789");
    });

    it("should extract ID from image URL path", () => {
      const result = extractor.extract("https://civitai.com/images/123456789");

      expect(result).toBe("123456789");
    });

    it("should handle whitespace around numeric ID", () => {
      const result = extractor.extract("  123456789  ");

      expect(result).toBe("123456789");
    });

    it("should return undefined for invalid input", () => {
      const result = extractor.extract("not-a-valid-id");

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = extractor.extract("");

      expect(result).toBeUndefined();
    });

    it("should return undefined for URL without ID", () => {
      const result = extractor.extract("https://civitai.com/images/");

      expect(result).toBeUndefined();
    });

    it("should handle ID in query param with other parameters", () => {
      const result = extractor.extract(
        "https://civitai.com/api/generation/data?type=image&id=987654321&format=json"
      );

      expect(result).toBe("987654321");
    });
  });

  describe("isNumericId", () => {
    it("should return true for numeric string", () => {
      expect(extractor.isNumericId("123456789")).toBe(true);
    });

    it("should return false for non-numeric string", () => {
      expect(extractor.isNumericId("abc123")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(extractor.isNumericId("")).toBe(false);
    });
  });

  describe("extractIdFromQueryParam", () => {
    it("should extract ID from query parameter", () => {
      const url = new URL(
        "https://civitai.com/api/generation/data?type=image&id=123456789"
      );
      const result = extractor.extractIdFromQueryParam(url);

      expect(result).toBe("123456789");
    });

    it("should return null if no id parameter", () => {
      const url = new URL("https://civitai.com/api/generation/data?type=image");
      const result = extractor.extractIdFromQueryParam(url);

      expect(result).toBeNull();
    });

    it("should return null if id is not numeric", () => {
      const url = new URL(
        "https://civitai.com/api/generation/data?id=not-numeric"
      );
      const result = extractor.extractIdFromQueryParam(url);

      expect(result).toBeNull();
    });
  });

  describe("extractIdFromPath", () => {
    it("should extract numeric ID from path", () => {
      const url = new URL("https://civitai.com/images/123456789");
      const result = extractor.extractIdFromPath(url);

      expect(result).toBe("123456789");
    });

    it("should return undefined if last path segment is not numeric", () => {
      const url = new URL("https://civitai.com/images/gallery");
      const result = extractor.extractIdFromPath(url);

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty path", () => {
      const url = new URL("https://civitai.com/");
      const result = extractor.extractIdFromPath(url);

      expect(result).toBeUndefined();
    });
  });
});
