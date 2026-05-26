// Types for CivitAI Orchestration API workflow status and photo management

export type WorkflowStatus =
  | "unassigned"
  | "preparing"
  | "scheduled"
  | "processing"
  | "succeeded"
  | "failed"
  | "expired"
  | "canceled";

export const TERMINAL_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "succeeded",
  "failed",
  "expired",
  "canceled",
];

export const IN_PROGRESS_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "unassigned",
  "preparing",
  "scheduled",
  "processing",
];

export interface WorkflowImage {
  id: string;
  url: string;
}

export interface WorkflowStep {
  name: string;
  $type: string;
  status: WorkflowStatus;
  output?:
    | {
        images?: WorkflowImage[];
      }
    | WorkflowImage[];
}

export interface Workflow {
  id: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
}

export interface CivitJobResult {
  photoBase64?: string | undefined;
  isLoading: boolean;
  error?: string | undefined;
}

export interface PhotoData {
  base64: string;
}
