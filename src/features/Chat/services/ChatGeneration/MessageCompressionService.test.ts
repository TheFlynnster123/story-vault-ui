import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../../services/Dependencies";
import type { UserChatMessage } from "../../../../services/CQRS/UserChatProjection";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";
import {
  MessageCompressionService,
  selectMessageCompressionCandidates,
} from "./MessageCompressionService";

describe("selectMessageCompressionCandidates", () => {
  it("counts only ordinary text messages after a candidate", () => {
    const messages = [
      createMessage("old", "assistant", longContent("Old")),
      createMessage("reasoning", "reasoning", longContent("Reasoning")),
      createMessage("image", "civit-workflow"),
      createMessage("user", "user-message", "Continue"),
      createMessage("assistant", "assistant", longContent("Reply")),
    ];

    expect(
      selectMessageCompressionCandidates(messages, {
        afterMessages: 2,
        minimumCharacters: 100,
      }).map((message) => message.id),
    ).toEqual(["old"]);
  });

  it("excludes short messages and messages with an existing compression", () => {
    const compressed = createMessage(
      "compressed",
      "assistant",
      longContent("Compressed"),
    );
    compressed.compression = {
      content: "Existing",
      sourceContentFingerprint: "fingerprint",
      userEdited: false,
    };

    expect(
      selectMessageCompressionCandidates(
        [
          compressed,
          createMessage("short", "user-message", "Short"),
          createMessage("recent", "assistant", longContent("Recent")),
        ],
        {
          afterMessages: 1,
          minimumCharacters: 100,
        },
      ),
    ).toEqual([]);
  });
});

describe("MessageCompressionService", () => {
  const chatId = "chat-1";
  const addMessageCompression = vi.fn();
  const postChat = vi.fn();

  beforeEach(() => {
    vi.spyOn(d, "SystemSettingsService").mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        messageCompressionSettings: {
          enabled: true,
          afterMessages: 1,
          minimumCharacters: 100,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "SystemPromptsService").mockReturnValue({
      Get: vi.fn().mockResolvedValue(DEFAULT_SYSTEM_PROMPTS),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "UserChatProjection").mockReturnValue({
      GetMessages: vi.fn().mockReturnValue([
        createMessage("old", "assistant", longContent("Old")),
        createMessage("recent", "user-message", "Continue"),
      ]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "OpenRouterChatAPI").mockReturnValue({
      postChat,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "ChatService").mockReturnValue({
      AddMessageCompression: addMessageCompression,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "ErrorService").mockReturnValue({
      log: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    postChat.mockResolvedValue("A concise summary.");
    addMessageCompression.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("generates and persists an eligible message compression", async () => {
    await new MessageCompressionService(chatId).compressEligibleMessages();

    expect(postChat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: "system",
          content: DEFAULT_SYSTEM_PROMPTS.messageCompressionPrompt,
        }),
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining(longContent("Old")),
        }),
      ]),
      DEFAULT_SYSTEM_PROMPTS.messageCompressionModel,
      "message-compression",
      "Message Compression",
      DEFAULT_SYSTEM_PROMPTS.messageCompressionRequestSettings,
    );
    expect(addMessageCompression).toHaveBeenCalledWith(
      "old",
      "A concise summary.",
      longContent("Old"),
    );
  });

  it("does nothing when automatic compression is disabled", async () => {
    vi.mocked(d.SystemSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        messageCompressionSettings: { enabled: false },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await new MessageCompressionService(chatId).compressEligibleMessages();

    expect(postChat).not.toHaveBeenCalled();
  });

  it("does not persist output that is not shorter than its source", async () => {
    postChat.mockResolvedValue(longContent("Too long") + longContent("Again"));

    await new MessageCompressionService(chatId).compressEligibleMessages();

    expect(addMessageCompression).not.toHaveBeenCalled();
  });
});

const createMessage = (
  id: string,
  type: UserChatMessage["type"],
  content?: string,
): UserChatMessage => ({
  id,
  type,
  content,
  hiddenByChapterId: undefined,
  deleted: false,
  hidden: false,
});

const longContent = (prefix: string): string =>
  `${prefix}: ${"continuity detail ".repeat(12)}`;
