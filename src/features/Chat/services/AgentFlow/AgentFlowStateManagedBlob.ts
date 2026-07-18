import { createManagedBlob } from "../../../../services/Blob/ManagedBlob";
import type { AgentFlowSuggestion } from "./AgentFlowService";

export interface AgentFlowState {
  pendingSuggestion?: AgentFlowSuggestion;
}

export const getAgentFlowStateManagedBlobInstance =
  createManagedBlob<AgentFlowState>("agent-flow-state");
