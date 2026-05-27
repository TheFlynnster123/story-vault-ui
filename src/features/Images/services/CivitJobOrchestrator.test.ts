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

  describe("getOrPollPhoto", () => {
    it("should return isLoading when workflow is still in progress", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createInProgressWorkflow(),
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({ isLoading: true });
      expectStoredPhotoCalledWith(chatId, jobId);
    });

    it("should include workflow cost while workflow is still in progress", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue({
        ...createInProgressWorkflow(),
        cost: { total: 23 },
      });

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: true,
        cost: { amount: 23 },
      });
    });

    it("should fall back to debit transaction cost when total is unavailable", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue({
        ...createInProgressWorkflow(),
        transactions: {
          list: [{ type: "debit", amount: 16, accountType: "blue" }],
        },
      });

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: true,
        cost: { amount: 16, currency: "blue" },
      });
    });

    it("should return stored photo without polling workflow status", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(mockPhotoBase64);

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        photoBase64: mockPhotoBase64,
        isLoading: false,
      });
      expectStoredPhotoCalledWith(chatId, jobId);
      expect(mockCivitOrchestrationAPI.getWorkflow).not.toHaveBeenCalled();
    });

    it("should download and return photo when workflow succeeded but not stored", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createSucceededWorkflow(mockBlobUrl),
      );
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

    it("should download from tRPC-style image output arrays", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue({
        id: jobId,
        status: "succeeded",
        steps: [
          {
            name: "$0",
            $type: "imageGen",
            status: "succeeded",
            output: [{ id: "img-1", url: mockBlobUrl }],
          },
        ],
      } satisfies Workflow);
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
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createFailedWorkflow(),
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "Image generation failed.",
      });
    });

    it("should return error when workflow expired", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
      mockCivitOrchestrationAPI.getWorkflow.mockResolvedValue(
        createExpiredWorkflow(),
      );

      const orchestrator = new CivitJobOrchestrator();
      const result = await orchestrator.getOrPollPhoto(chatId, jobId);

      expect(result).toEqual({
        isLoading: false,
        photoBase64: undefined,
        error: "Image generation timed out.",
      });
    });

    it("should return error message when Error is thrown", async () => {
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
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
      mockPhotoStorageService.getStoredPhoto.mockResolvedValue(null);
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
