import type { CivitJobResult, Workflow } from "./CivitJob";
import { IN_PROGRESS_WORKFLOW_STATUSES } from "./CivitJob";
import { d } from "../../../services/Dependencies";

/**
 * Main orchestration service for managing the CivitAI workflow lifecycle.
 * Polls workflow status, downloads and caches images once complete.
 */
export class CivitJobOrchestrator {
  async getOrPollPhoto(chatId: string, workflowId: string): Promise<CivitJobResult> {
    try {
      const workflow = await d.CivitOrchestrationAPI().getWorkflow(workflowId);

      if (isInProgress(workflow)) return this.loadingResponse();

      const storedPhoto = await d
        .PhotoStorageService()
        .getStoredPhoto(chatId, workflowId);

      if (storedPhoto) return this.storedPhotoResponse(storedPhoto);

      const imageUrl = getFirstImageUrl(workflow);

      if (imageUrl) return await this.downloadPhoto(chatId, workflowId, imageUrl);

      return this.errorResponse(buildErrorMessage(workflow));
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  private async downloadPhoto(
    chatId: string,
    workflowId: string,
    imageUrl: string,
  ): Promise<CivitJobResult> {
    const photoBase64 = await d
      .PhotoStorageService()
      .downloadAndSavePhoto(chatId, workflowId, imageUrl);

    return {
      photoBase64,
      isLoading: false,
    };
  }

  private loadingResponse = (): CivitJobResult => ({ isLoading: true });

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

const isInProgress = (workflow: Workflow): boolean =>
  IN_PROGRESS_WORKFLOW_STATUSES.includes(workflow.status);

const getFirstImageUrl = (workflow: Workflow): string | undefined =>
  workflow.steps?.[0]?.output?.images?.[0]?.url;

const buildErrorMessage = (workflow: Workflow): string => {
  if (workflow.status === "failed") return "Image generation failed.";
  if (workflow.status === "expired") return "Image generation timed out.";
  if (workflow.status === "canceled") return "Image generation was canceled.";
  return "No image available.";
};
