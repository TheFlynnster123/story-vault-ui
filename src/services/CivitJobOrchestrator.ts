import type { CivitJobResult } from "../types/CivitJob";
import { d } from "../app/Dependencies/Dependencies";

/**
 * Main orchestration service for managing Civit job workflow
 */
export class CivitJobOrchestrator {
  async getOrPollPhoto(chatId: string, jobId: string): Promise<CivitJobResult> {
    try {
      // First, check job status (free endpoint)
      const jobStatus = await d.JobStatusService().getJobStatus(jobId);

      // If job is still scheduled, return status without checking database
      if (jobStatus.scheduled) {
        return this.scheduledJobResponse();
      }

      // Job is not scheduled, check if we already have the photo in our database
      const storedPhoto = await d
        .PhotoStorageService()
        .getStoredPhoto(chatId, jobId);

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
      scheduled: true,
      isLoading: false,
      error: null,
    };
  }

  private storedPhotoResponse(photoBase64: string): CivitJobResult {
    return {
      photoBase64,
      scheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private async downloadAndReturnPhoto(
    chatId: string,
    jobId: string,
    blobUrl: string
  ): Promise<CivitJobResult> {
    const photoBase64 = await d
      .PhotoStorageService()
      .downloadAndSavePhoto(chatId, jobId, blobUrl);

    return {
      photoBase64,
      scheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private noPhotoAvailableResponse(): CivitJobResult {
    return {
      photoBase64: null,
      scheduled: false,
      isLoading: false,
      error: null,
    };
  }

  private errorResponse(error: unknown): CivitJobResult {
    return {
      photoBase64: null,
      scheduled: false,
      isLoading: false,
      error:
        error instanceof Error ? error : new Error("Unknown error occurred"),
    };
  }
}
