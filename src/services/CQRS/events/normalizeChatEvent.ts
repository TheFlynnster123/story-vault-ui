import type {
  AssistantResponseCreatedEvent,
  ChatEvent,
  CivitJobCreatedEvent,
  CivitJobUpdatedEvent,
  CivitWorkflowCreatedEvent,
  CivitWorkflowUpdatedEvent,
  InstructionCreatedEvent,
  UserMessageCreatedEvent,
} from "./ChatEvent";

export interface LegacyMessageCreatedEvent {
  type: "MessageCreated";
  messageId: string;
  role: "assistant" | "user" | "system";
  content: string;
}

export type PersistedChatEvent =
  | ChatEvent
  | LegacyMessageCreatedEvent
  | CivitJobCreatedEvent
  | CivitJobUpdatedEvent;

/**
 * Keeps legacy persisted image-job events readable while exposing only the
 * workflow event shape to the rest of the application.
 */
export const normalizeChatEvent = (event: PersistedChatEvent): ChatEvent => {
  if (event.type === "MessageCreated") {
    return normalizeLegacyMessage(event);
  }

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

const normalizeLegacyMessage = (
  event: LegacyMessageCreatedEvent,
):
  | UserMessageCreatedEvent
  | AssistantResponseCreatedEvent
  | InstructionCreatedEvent => {
  const { messageId, content } = event;

  switch (event.role) {
    case "user":
      return { type: "UserMessageCreated", messageId, content };
    case "assistant":
      return { type: "AssistantResponseCreated", messageId, content };
    case "system":
      return { type: "InstructionCreated", messageId, content };
  }
};
