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

export interface WorkflowCost {
  amount: number;
  currency?: string;
}

export interface WorkflowTransaction {
  type?: string;
  amount?: number;
  accountType?: string;
}

export interface WorkflowStep {
  name: string;
  $type: string;
  status: WorkflowStatus;
  jobs?: {
    cost?: number;
  }[];
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
  cost?: {
    total?: number;
  };
  transactions?: WorkflowTransaction[] | { list?: WorkflowTransaction[] };
}

export interface WorkflowImageResult {
  photoBase64?: string | undefined;
  isLoading: boolean;
  error?: string | undefined;
  cost?: WorkflowCost | undefined;
}

export type CivitJobResult = WorkflowImageResult;

export interface PhotoData {
  base64: string;
}
