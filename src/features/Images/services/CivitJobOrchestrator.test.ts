import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CivitJobOrchestrator } from "./CivitJobOrchestrator";
import { d } from "../../../services/Dependencies";
import type { Workflow } from "./CivitJob";

vi.mock("../../../services/Dependencies");

describe("CivitJobOrchestrator", () => {
  let mockCivitOrchestrationAPI: any;
  let mockPhotoStorageService: any;

  const chatId = "test-chat-id";
  const jobId = "wf_test-workflow-id";
  const mockPhotoBase64 = "data:image/png;base64,mock-photo-data";
  const mockBlobUrl = "https://example.com/photo.png";

  beforeEach(() => {
    mockCivitOrchestrationAPI = {
      getWorkflow: vi.fn(),
    };

    mockPhotoStorageService = {
      getStoredPhoto: vi.fn(),
      downloadAndSavePhoto: vi.fn(),
    };

    vi.mocked(d.CivitOrchestrationAPI).mockReturnValue(
      mockCivitOrchestrationAPI,
    );
    vi.mocked(d.PhotoStorageService).mockReturnValue(mockPhotoStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createInProgressWorkflow = (): Workflow => ({
    id: jobId,
    status: "processing",
    steps: [],
  });

  const createSucceededWorkflow = (imageUrl: string): Workflow => ({
    id: jobId,
    status: "succeeded",
    steps: [
      {
        name: "step-0",
        $type: "imageGen",
        status: "succeeded",
        output: { images: [{ id: "img-1", url: imageUrl }] },
      },
    ],
  });

  const createFailedWorkflow = (): Workflow => ({
    id: jobId,
    status: "failed",
    steps: [],
  });

  const createExpiredWorkflow = (): Workflow => ({
    id: jobId,
    status: "expired",
    steps: [],
  });

  const createSucceededWorkflowNoImage = (): Workflow => ({
    id: jobId,
    status: "succeeded",
    steps: [],
  });

  describe("getOrPollPhoto", () => {
    it("should return isLoading when workflow is still in progress", async () => {
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createInProgressWorkflow(),
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({ isLoading: true });
      expect(mockPhotoStorageService.getStoredPhoto).not.toHaveBeenCalled();
    });

    it("should return stored photo when available in database", async () => {
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createSucceededWorkflowNoImage(),
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

    it("should download and return photo when workflow succeeded but not stored", async () => {
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createSucceededWorkflow(mockBlobUrl),
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockPhotoStorageService.downloadAndSavePhoto.mockResolvedValue(
        mockPhotoBase64,
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        photoBase64: mockPhotoBase64,
        isLoading: false,
      });
      expectDownloadAndSavePhotoCalledWith(chatId, jobId, mockBlobUrl);
    });

    it("should return error when workflow failed", async () => {
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createFailedWorkflow(),
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "Image generation failed.",
      });
    });

    it("should return error when workflow expired", async () => {
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createExpiredWorkflow(),
      );
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "Image generation timed out.",
      });
    });

    it("should return error message when Error is thrown", async () => {
      const errorMessage = "Network connection failed";
      mockCivitOrchestrationAPI.getWorkflow.mockRejectedValue(
        new Error(errorMessage),
      );

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
      mockCivitOrchestrationAPI.getWorkflow.mockRejectedValue(errorString);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: errorString,
      });
    });
  });

  const expectStoredPhotoCalledWith = (chatId: string, workflowId: string) => {
    expect(mockPhotoStorageService.getStoredPhoto).toHaveBeenCalledWith(
      chatId,
      workflowId,
    );
  };

  const expectDownloadAndSavePhotoCalledWith = (
    chatId: string,
    workflowId: string,
    imageUrl: string,
  ) => {
    expect(mockPhotoStorageService.downloadAndSavePhoto).toHaveBeenCalledWith(
      chatId,
      workflowId,
      imageUrl,
    );
  };
});
