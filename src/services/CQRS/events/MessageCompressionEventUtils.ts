import type {
  MessageCompressionCreatedEvent,
  MessageCompressionEditedEvent,
} from "./ChatEvent";

export class MessageCompressionCreatedEventUtil {
  public static Create(
    messageId: string,
    compressedContent: string,
    sourceContent: string,
  ): MessageCompressionCreatedEvent {
    return {
      type: "MessageCompressionCreated",
      messageId,
      compressedContent,
      sourceContentFingerprint: createMessageContentFingerprint(sourceContent),
    };
  }
}

export class MessageCompressionEditedEventUtil {
  public static Create(
    messageId: string,
    compressedContent: string,
  ): MessageCompressionEditedEvent {
    return {
      type: "MessageCompressionEdited",
      messageId,
      compressedContent,
    };
  }
}

export const createMessageContentFingerprint = (content: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < content.length; index++) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${content.length}:${(hash >>> 0).toString(16)}`;
};
