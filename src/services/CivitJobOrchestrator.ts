import type { CivitJobResult, CivitJobStatus } from "../types/CivitJob";
import { d } from "../app/Dependencies/Dependencies";

/**
 * Main orchestration service for managing Civit job workflow
 */
export class CivitJobOrchestrator {
  async getOrPollPhoto(chatId: string, jobId: string): Promise<CivitJobResult> {
    try {
      const jobStatus = await d.JobStatusService().getJobStatus(jobId);

      if (jobStatus.scheduled) return this.scheduledJobResponse();

      const photoBase64 = await d
        .PhotoStorageService()
        .getStoredPhoto(chatId, jobId);

      if (photoBase64) return this.storedPhotoResponse(photoBase64);

      if (this.photoIsAvailable(jobStatus))
        return await this.downloadPhoto(
          chatId,
          jobId,
          this.getPhotoUrl(jobStatus)
        );

      return this.errorResponse("No photo available.");
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  private getPhotoUrl = (jobStatus: CivitJobStatus): string =>
    jobStatus.result[0].blobUrl;

  private photoIsAvailable = (jobStatus: CivitJobStatus) =>
    jobStatus.result &&
    jobStatus.result.length > 0 &&
    jobStatus.result[0].available;

  private async downloadPhoto(
    chatId: string,
    jobId: string,
    blobUrl: string
  ): Promise<CivitJobResult> {
    const photoBase64 = await d
      .PhotoStorageService()
      .downloadAndSavePhoto(chatId, jobId, blobUrl);

    return {
      photoBase64,
      isLoading: false,
    };
  }

  private scheduledJobResponse = (): CivitJobResult => ({
    isLoading: true,
  });

  private storedPhotoResponse = (photoBase64: string): CivitJobResult => ({
    photoBase64,
    isLoading: false,
  });

  private errorResponse = (error: Error | string): CivitJobResult => ({
    isLoading: false,
    photoBase64: undefined,
    error: error instanceof Error ? error.message : error,
  });
}
