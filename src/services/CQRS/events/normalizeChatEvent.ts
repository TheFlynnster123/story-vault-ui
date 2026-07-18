import type {
  ChatEvent,
  CivitJobCreatedEvent,
  CivitJobUpdatedEvent,
  CivitWorkflowCreatedEvent,
  CivitWorkflowUpdatedEvent,
} from "./ChatEvent";

export type PersistedChatEvent =
  | ChatEvent
  | CivitJobCreatedEvent
  | CivitJobUpdatedEvent;

/**
 * Keeps legacy persisted image-job events readable while exposing only the
 * workflow event shape to the rest of the application.
 */
export const normalizeChatEvent = (event: PersistedChatEvent): ChatEvent => {
  if (event.type === "CivitJobCreated") {
    const { type: legacyType, jobId, ...rest } = event;
    void legacyType;
    return {
      type: "CivitWorkflowCreated",
      messageId: jobId,
      workflowId: jobId,
      ...rest,
    } satisfies CivitWorkflowCreatedEvent;
  }

  if (event.type === "CivitJobUpdated") {
    const { type: legacyType, patch, ...rest } = event;
    void legacyType;
    const { jobId, ...workflowPatch } = patch;
    return {
      type: "CivitWorkflowUpdated",
      ...rest,
      patch: {
        ...workflowPatch,
        ...(jobId !== undefined ? { workflowId: jobId } : {}),
      },
    } satisfies CivitWorkflowUpdatedEvent;
  }

  return event;
};
