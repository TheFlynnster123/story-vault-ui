import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CivitJobOrchestrator } from "./CivitJobOrchestrator";
import { d } from "../app/Dependencies/Dependencies";
import type { CivitJobStatus } from "../types/CivitJob";

vi.mock("../app/Dependencies/Dependencies");

describe("CivitJobOrchestrator", () => {
  let mockCivitJobAPI: any;
  let mockPhotoStorageService: any;

  const chatId = "test-chat-id";
  const jobId = "test-job-id";
  const mockPhotoBase64 = "data:image/png;base64,mock-photo-data";
  const mockBlobUrl = "https://example.com/photo.png";

  beforeEach(() => {
    mockCivitJobAPI = {
      getJobStatus: vi.fn(),
    };

    mockPhotoStorageService = {
      getStoredPhoto: vi.fn(),
      downloadAndSavePhoto: vi.fn(),
    };

    vi.mocked(d.CivitJobAPI).mockReturnValue(mockCivitJobAPI);
    vi.mocked(d.PhotoStorageService).mockReturnValue(mockPhotoStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createScheduledJobStatus = (): CivitJobStatus => ({
    scheduled: true,
    result: [],
  });

  const createCompletedJobStatus = (blobUrl: string): CivitJobStatus => ({
    scheduled: false,
    result: [{ available: true, blobUrl }],
  });

  const createUnavailablePhotoJobStatus = (): CivitJobStatus => ({
    scheduled: false,
    result: [{ available: false, blobUrl: "" }],
  });

  const createEmptyResultJobStatus = (): CivitJobStatus => ({
    scheduled: false,
    result: [],
  });

  describe("getOrPollPhoto", () => {
    it("should return isLoading when job is still scheduled", async () => {
      mockCivitJobAPI.getJobStatus.mockResolvedValue(
        createScheduledJobStatus()
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({ isLoading: true });
      expect(mockPhotoStorageService.getStoredPhoto).not.toHaveBeenCalled();
    });

    it("should return stored photo when available in database", async () => {
      mockCivitJobAPI.getJobStatus.mockResolvedValue(
        createEmptyResultJobStatus()
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(mockPhotoBase64);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        photoBase64: mockPhotoBase64,
        isLoading: false,
      });
      expectStoredPhotoCalledWith(chatId, jobId);
    });

    it("should download and return photo when job complete but not stored", async () => {
      mockCivitJobAPI.getJobStatus.mockResolvedValue(
        createCompletedJobStatus(mockBlobUrl)
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockPhotoStorageService.downloadAndSavePhoto.mockResolvedValue(
        mockPhotoBase64
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        photoBase64: mockPhotoBase64,
        isLoading: false,
      });
      expectDownloadAndSavePhotoCalledWith(chatId, jobId, mockBlobUrl);
    });

    it("should return error when photo is not available", async () => {
      mockCivitJobAPI.getJobStatus.mockResolvedValue(
        createUnavailablePhotoJobStatus()
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "No photo available.",
      });
    });

    it("should return error when result array is empty", async () => {
      mockCivitJobAPI.getJobStatus.mockResolvedValue(
        createEmptyResultJobStatus()
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "No photo available.",
      });
    });

    it("should return error message when Error is thrown", async () => {
      const errorMessage = "Network connection failed";
      mockCivitJobAPI.getJobStatus.mockRejectedValue(new Error(errorMessage));

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: errorMessage,
      });
    });

    it("should return string error when string is thrown", async () => {
      const errorString = "Something went wrong";
      mockCivitJobAPI.getJobStatus.mockRejectedValue(errorString);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: errorString,
      });
    });
  });

  const expectStoredPhotoCalledWith = (chatId: string, jobId: string) => {
    expect(mockPhotoStorageService.getStoredPhoto).toHaveBeenCalledWith(
      chatId,
      jobId
    );
  };

  const expectDownloadAndSavePhotoCalledWith = (
    chatId: string,
    jobId: string,
    blobUrl: string
  ) => {
    expect(mockPhotoStorageService.downloadAndSavePhoto).toHaveBeenCalledWith(
      chatId,
      jobId,
      blobUrl
    );
  };
});
