import { JobStatusService } from "./JobStatusService";
import { PhotoStorageService } from "./PhotoStorageService";
import type { CivitJobResult } from "../types/CivitJob";

/**
 * Main orchestration service for managing Civit job workflow
 */
export class CivitJobOrchestrator {
  private jobStatusService: JobStatusService;
  private photoStorageService: PhotoStorageService;

  constructor() {
    this.jobStatusService = new JobStatusService();
    this.photoStorageService = new PhotoStorageService();
  }

  async getOrPollPhoto(chatId: string, jobId: string): Promise<CivitJobResult> {
    try {
      // First, check job status (free endpoint)
      const jobStatus = await this.jobStatusService.getJobStatus(jobId);

      // If job is still scheduled, return status without checking database
      if (jobStatus.scheduled) {
        return this.scheduledJobResponse();
      }

      // Job is not scheduled, check if we already have the photo in our database
      const storedPhoto = await this.photoStorageService.getStoredPhoto(
        chatId,
        jobId
      );
      if (storedPhoto) {
        return this.storedPhotoResponse(storedPhoto);
      }

      // If job is complete and has a result, download and save the photo
      if (
        jobStatus.result &&
        jobStatus.result.length > 0 &&
        jobStatus.result[0].available
      ) {
        return await this.downloadAndReturnPhoto(
          chatId,
          jobId,
          jobStatus.result[0].blobUrl
        );
      }

      // Job is not scheduled but no photo available
      return this.noPhotoAvailableResponse();
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private scheduledJobResponse(): CivitJobResult {
    return {
      photoBase64: null,
      isScheduled: true,
      isLoading: false,
      error: null,
    };
  }

  private storedPhotoResponse(photoBase64: string): CivitJobResult {
    return {
      photoBase64,
      isScheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private async downloadAndReturnPhoto(
    chatId: string,
    jobId: string,
    blobUrl: string
  ): Promise<CivitJobResult> {
    const photoBase64 = await this.photoStorageService.downloadAndSavePhoto(
      chatId,
      jobId,
      blobUrl
    );

    return {
      photoBase64,
      isScheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private noPhotoAvailableResponse(): CivitJobResult {
    return {
      photoBase64: null,
      isScheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private errorResponse(error: unknown): CivitJobResult {
    return {
      photoBase64: null,
      isScheduled: false,
      isLoading: false,
      error:
        error instanceof Error ? error : new Error("Unknown error occurred"),
    };
  }
}
