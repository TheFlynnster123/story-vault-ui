import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PhotoStorageService } from "./PhotoStorageService";
import { d } from "../Dependencies";
import type { PhotoData } from "./CivitJob";

vi.mock("../Dependencies");

// Mock global fetch
global.fetch = vi.fn();

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  readAsDataURL(_blob: Blob) {
    // Simulate async read
    setTimeout(() => {
      this.result = "data:image/png;base64,mock-base64-data";
      this.onloadend?.();
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

describe("PhotoStorageService", () => {
  let mockCivitJobAPI: any;
  const chatId = "test-chat-id";
  const jobId = "test-job-id";
  const mockPhotoBase64 = "data:image/png;base64,stored-photo-data";
  const mockBlobUrl = "https://example.com/photo.png";

  beforeEach(() => {
    mockCivitJobAPI = {
      getPhoto: vi.fn(),
      savePhoto: vi.fn(),
    };

    vi.mocked(d.CivitJobAPI).mockReturnValue(mockCivitJobAPI);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createService = () => new PhotoStorageService();

  const mockGetPhotoSuccess = (base64: string) => {
    mockCivitJobAPI.getPhoto.mockResolvedValue({ base64 });
  };

  const mockGetPhotoError = (error: Error) => {
    mockCivitJobAPI.getPhoto.mockRejectedValue(error);
  };

  const mockFetchSuccess = (blob: Blob) => {
    vi.mocked(fetch).mockResolvedValue({
      blob: vi.fn().mockResolvedValue(blob),
    } as any);
  };

  const mockSavePhotoSuccess = () => {
    mockCivitJobAPI.savePhoto.mockResolvedValue(true);
  };

  describe("getStoredPhoto", () => {
    it("should return base64 string when photo exists", async () => {
      mockGetPhotoSuccess(mockPhotoBase64);

      const result = await createService().getStoredPhoto(chatId, jobId);

      expect(result).toBe(mockPhotoBase64);
      expectGetPhotoCalledWith(chatId, jobId);
    });

    it("should return undefined when photo does not exist", async () => {
      mockGetPhotoError(new Error("Not found"));

      const result = await createService().getStoredPhoto(chatId, jobId);

      expect(result).toBeUndefined();
      expectGetPhotoCalledWith(chatId, jobId);
    });

    it("should return undefined when API throws error", async () => {
      mockGetPhotoError(new Error("Network connection failed"));

      const result = await createService().getStoredPhoto(chatId, jobId);

      expect(result).toBeUndefined();
    });

    it("should handle empty base64 string", async () => {
      mockGetPhotoSuccess("");

      const result = await createService().getStoredPhoto(chatId, jobId);

      expect(result).toBe("");
    });
  });

  describe("downloadAndSavePhoto", () => {
    const createMockBlob = () =>
      new Blob(["mock-image-data"], { type: "image/png" });

    it("should download, convert, and save photo", async () => {
      mockFetchSuccess(createMockBlob());
      mockSavePhotoSuccess();

      const result = await createService().downloadAndSavePhoto(
        chatId,
        jobId,
        mockBlobUrl
      );

      expect(result).toBe("data:image/png;base64,mock-base64-data");
      expect(fetch).toHaveBeenCalledWith(mockBlobUrl);
      expectSavePhotoCalledWith(chatId, jobId, {
        base64: "data:image/png;base64,mock-base64-data",
      });
    });

    it("should propagate fetch errors", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      await expect(
        createService().downloadAndSavePhoto(chatId, jobId, mockBlobUrl)
      ).rejects.toThrow("Network error");
    });

    it("should propagate save errors", async () => {
      mockFetchSuccess(createMockBlob());
      mockCivitJobAPI.savePhoto.mockRejectedValue(new Error("Save failed"));

      await expect(
        createService().downloadAndSavePhoto(chatId, jobId, mockBlobUrl)
      ).rejects.toThrow("Save failed");
    });

    it("should handle blob conversion errors", async () => {
      mockFetchSuccess(createMockBlob());

      // Mock FileReader to simulate error
      const errorFileReader = class {
        result: string | ArrayBuffer | null = null;
        onloadend: (() => void) | null = null;
        onerror: ((error: any) => void) | null = null;

        readAsDataURL(_blob: Blob) {
          setTimeout(() => {
            this.onerror?.(new Error("FileReader error"));
          }, 0);
        }
      };

      global.FileReader = errorFileReader as any;

      await expect(
        createService().downloadAndSavePhoto(chatId, jobId, mockBlobUrl)
      ).rejects.toThrow("FileReader error");

      // Restore FileReader
      global.FileReader = MockFileReader as any;
    });
  });

  const expectGetPhotoCalledWith = (chatId: string, jobId: string) => {
    expect(mockCivitJobAPI.getPhoto).toHaveBeenCalledWith(chatId, jobId);
  };

  const expectSavePhotoCalledWith = (
    chatId: string,
    jobId: string,
    photoData: PhotoData
  ) => {
    expect(mockCivitJobAPI.savePhoto).toHaveBeenCalledWith(
      chatId,
      jobId,
      photoData
    );
  };
});
