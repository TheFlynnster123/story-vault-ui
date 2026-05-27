import type { CivitJobResult, Workflow, WorkflowCost } from "./CivitJob";
import { IN_PROGRESS_WORKFLOW_STATUSES } from "./CivitJob";
import { d } from "../../../services/Dependencies";

/**
 * Main orchestration service for managing the CivitAI workflow lifecycle.
 * Polls workflow status, downloads and caches images once complete.
 */
export class CivitJobOrchestrator {
  async getOrPollPhoto(chatId: string, workflowId: string): Promise<CivitJobResult> {
    try {
      const storedPhoto = await d
        .PhotoStorageService()
        .getStoredPhoto(chatId, workflowId);

      if (storedPhoto) return this.storedPhotoResponse(storedPhoto);

      const workflow = await d.CivitOrchestrationAPI().getWorkflow(workflowId);
      const cost = getWorkflowCost(workflow);

      if (isInProgress(workflow)) return this.loadingResponse(cost);

      const imageUrl = getFirstImageUrl(workflow);

      if (imageUrl) {
        return await this.downloadPhoto(chatId, workflowId, imageUrl, cost);
      }

      return this.errorResponse(buildErrorMessage(workflow), cost);
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  private async downloadPhoto(
    chatId: string,
    workflowId: string,
    imageUrl: string,
    cost?: WorkflowCost,
  ): Promise<CivitJobResult> {
    const photoBase64 = await d
      .PhotoStorageService()
      .downloadAndSavePhoto(chatId, workflowId, imageUrl);

    return {
      photoBase64,
      isLoading: false,
      ...(cost ? { cost } : {}),
    };
  }

  private loadingResponse = (cost?: WorkflowCost): CivitJobResult => ({
    isLoading: true,
    ...(cost ? { cost } : {}),
  });

  private storedPhotoResponse = (photoBase64: string): CivitJobResult => ({
    photoBase64,
    isLoading: false,
  });

  private errorResponse = (
    error: Error | string,
    cost?: WorkflowCost,
  ): CivitJobResult => ({
    isLoading: false,
    photoBase64: undefined,
    error: error instanceof Error ? error.message : error,
    ...(cost ? { cost } : {}),
  });
}

const isInProgress = (workflow: Workflow): boolean =>
  IN_PROGRESS_WORKFLOW_STATUSES.includes(workflow.status);

const getFirstImageUrl = (workflow: Workflow): string | undefined =>
  workflow.steps?.flatMap(getStepImageUrls)[0];

const getStepImageUrls = (step: Workflow["steps"][number]): string[] => {
  if (Array.isArray(step.output)) {
    return step.output.map((image) => image.url).filter(Boolean);
  }

  return step.output?.images?.map((image) => image.url).filter(Boolean) ?? [];
};

const buildErrorMessage = (workflow: Workflow): string => {
  if (workflow.status === "failed") return "Image generation failed.";
  if (workflow.status === "expired") return "Image generation timed out.";
  if (workflow.status === "canceled") return "Image generation was canceled.";
  return "No image available.";
};

export const getWorkflowCost = (
  workflow: Workflow,
): WorkflowCost | undefined => {
  const topLevelTotal = workflow.cost?.total;
  if (typeof topLevelTotal === "number" && topLevelTotal > 0) {
    return { amount: topLevelTotal };
  }

  const stepJobCost = workflow.steps
    ?.flatMap((step) => step.jobs ?? [])
    .map((job) => job.cost)
    .find((cost) => typeof cost === "number" && cost > 0);
  if (typeof stepJobCost === "number") return { amount: stepJobCost };

  const transactions = Array.isArray(workflow.transactions)
    ? workflow.transactions
    : workflow.transactions?.list;
  const debit = transactions?.find(
    (transaction) =>
      transaction.type === "debit" &&
      typeof transaction.amount === "number" &&
      transaction.amount > 0,
  );

  if (debit?.amount) {
    return { amount: debit.amount, currency: debit.accountType };
  }

  return undefined;
};
