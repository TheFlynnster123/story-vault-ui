import { beforeEach, describe, expect, it } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import {
  UserChatProjection,
  type UserChatMessage,
} from "../UserChatProjection";
import type { ChatEvent } from "../events/ChatEvent";
import {
  MessageCompressionCreatedEventUtil,
  MessageCompressionEditedEventUtil,
} from "../events/MessageCompressionEventUtils";
import {
  createTextMessageEvent,
  type TextMessageAuthor,
} from "./TextMessageEventTestUtils";

describe("message compression projections", () => {
  let userProjection: UserChatProjection;
  let llmProjection: LLMChatProjection;

  beforeEach(() => {
    userProjection = new UserChatProjection();
    llmProjection = new LLMChatProjection();
  });

  it("keeps the original visible while substituting an eligible LLM message", () => {
    const original = createMessage(
      "message-1",
      "assistant",
      "A long original response with several continuity details.",
    );
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "The response preserves the important continuity details.",
        original.content,
      ),
    );
    process(createMessage("message-2", "user", "Continue."));

    expect(getUserMessage(original.messageId).content).toBe(original.content);
    expect(getUserMessage(original.messageId).compression?.content).toBe(
      "The response preserves the important continuity details.",
    );
    expect(llmProjection.GetMessage(original.messageId)?.content).toBe(
      original.content,
    );
    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 1 })[0]
        .content,
    ).toContain("The response preserves the important continuity details.");
  });

  it("keeps recent compressed messages original until they age past the policy", () => {
    const original = createMessage("message-1", "assistant", "Original");
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "Compressed",
        original.content,
      ),
    );
    process(createMessage("message-2", "user", "Second"));

    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 2 })[0]
        .content,
    ).toBe("Original");
  });

  it("does not count reasoning toward message age", () => {
    const original = createMessage("message-1", "assistant", "Original");
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "Compressed",
        original.content,
      ),
    );
    process({
      type: "ReasoningCreated",
      messageId: "reasoning-1",
      content: "Private reasoning",
    });

    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 1 })[0]
        .content,
    ).toBe("Original");
  });

  it("projects user edits to the compression without changing the original", () => {
    const original = createMessage("message-1", "assistant", "Original");
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "Generated compression",
        original.content,
      ),
    );
    process(
      MessageCompressionEditedEventUtil.Create(
        original.messageId,
        "User-corrected compression",
      ),
    );

    expect(getUserMessage(original.messageId)).toMatchObject({
      content: "Original",
      compression: {
        content: "User-corrected compression",
        userEdited: true,
      },
    });
    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 0 })[0]
        .content,
    ).toContain("User-corrected compression");
  });

  it("invalidates the compression when the original message is edited", () => {
    const original = createMessage("message-1", "assistant", "Original");
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "Compressed",
        original.content,
      ),
    );
    process({
      type: "MessageEdited",
      messageId: original.messageId,
      newContent: "Edited original",
    });

    expect(getUserMessage(original.messageId).compression).toBeUndefined();
    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 0 })[0]
        .content,
    ).toBe("Edited original");
  });

  it("ignores a stale async result created from older source content", () => {
    const original = createMessage("message-1", "assistant", "Original");
    const staleCompression = MessageCompressionCreatedEventUtil.Create(
      original.messageId,
      "Stale compression",
      original.content,
    );
    process(original);
    process({
      type: "MessageEdited",
      messageId: original.messageId,
      newContent: "Edited while compression was running",
    });
    process(staleCompression);

    expect(getUserMessage(original.messageId).compression).toBeUndefined();
    expect(
      llmProjection.GetMessages({ messageCompressionAfterMessages: 0 })[0]
        .content,
    ).toBe("Edited while compression was running");
  });

  it("traces whether original or compressed content reached context", () => {
    const original = createMessage("message-1", "assistant", "Original");
    process(original);
    process(
      MessageCompressionCreatedEventUtil.Create(
        original.messageId,
        "Compressed",
        original.content,
      ),
    );
    process(createMessage("message-2", "user", "Second"));

    const context = llmProjection.GetContext({
      messageCompressionAfterMessages: 1,
    });

    expect(context.trace).toEqual([
      expect.objectContaining({
        id: original.messageId,
        contentRepresentation: "message-compression",
        originalCharacterCount: original.content.length,
      }),
      expect.objectContaining({
        id: "message-2",
        contentRepresentation: "original",
      }),
    ]);
  });

  const process = (event: ChatEvent) => {
    userProjection.process(event);
    llmProjection.process(event);
  };

  const getUserMessage = (messageId: string): UserChatMessage => {
    const message = userProjection.GetMessage(messageId);
    expect(message).toBeDefined();
    return message!;
  };
});

const createMessage = (
  messageId: string,
  role: TextMessageAuthor,
  content: string,
) => createTextMessageEvent(messageId, role, content);
