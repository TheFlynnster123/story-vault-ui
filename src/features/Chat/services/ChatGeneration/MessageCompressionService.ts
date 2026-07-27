import { d } from "../../../../services/Dependencies";
import type { UserChatMessage } from "../../../../services/CQRS/UserChatProjection";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import {
  DEFAULT_SYSTEM_PROMPTS,
  type SystemPrompts,
} from "../../../Prompts/services/SystemPrompts";
import {
  normalizeMessageCompressionAfterMessages,
  normalizeMessageCompressionMinimumCharacters,
  type MessageCompressionSettings,
} from "../../../SystemSettings/services/SystemSettings";

const MAX_COMPRESSIONS_PER_PASS = 2;
const COMPRESSIBLE_MESSAGE_TYPES = new Set<UserChatMessage["type"]>([
  "user-message",
  "assistant",
  "system-message",
]);

export const getMessageCompressionServiceInstance = createInstanceCache(
  (chatId: string) => new MessageCompressionService(chatId),
);

export class MessageCompressionService {
  private readonly chatId: string;
  private readonly attemptedMessageIds = new Set<string>();
  private readonly inFlightMessageIds = new Set<string>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async compressEligibleMessages(): Promise<void> {
    try {
      const systemSettings = await d.SystemSettingsService().Get();
      const settings = systemSettings?.messageCompressionSettings;
      if (!settings?.enabled) return;

      const candidates = selectMessageCompressionCandidates(
        d.UserChatProjection(this.chatId).GetMessages(),
        settings,
      )
        .filter(
          (message) =>
            !this.attemptedMessageIds.has(message.id) &&
            !this.inFlightMessageIds.has(message.id),
        )
        .slice(0, MAX_COMPRESSIONS_PER_PASS);

      for (const candidate of candidates) {
        await this.compressCandidate(candidate);
      }
    } catch (error) {
      d.ErrorService().log("Failed to compress eligible messages", error);
    }
  }

  private async compressCandidate(message: UserChatMessage): Promise<void> {
    const sourceContent = message.content;
    if (!sourceContent) return;

    this.inFlightMessageIds.add(message.id);
    this.attemptedMessageIds.add(message.id);

    try {
      const prompts =
        (await d.SystemPromptsService().Get()) ?? DEFAULT_SYSTEM_PROMPTS;
      const compressedContent = await d.OpenRouterChatAPI().postChat(
        buildMessageCompressionRequest(message, prompts),
        prompts.messageCompressionModel,
        "message-compression",
        "Message Compression",
        prompts.messageCompressionRequestSettings,
      );
      const normalizedCompression = compressedContent.trim();

      if (
        !normalizedCompression ||
        normalizedCompression.length >= sourceContent.length
      ) {
        return;
      }

      await d
        .ChatService(this.chatId)
        .AddMessageCompression(
          message.id,
          normalizedCompression,
          sourceContent,
        );
    } catch (error) {
      d.ErrorService().log(
        `Failed to compress message ${message.id}`,
        error,
      );
    } finally {
      this.inFlightMessageIds.delete(message.id);
    }
  }
}

export const selectMessageCompressionCandidates = (
  messages: UserChatMessage[],
  settings: MessageCompressionSettings,
): UserChatMessage[] => {
  const afterMessages = normalizeMessageCompressionAfterMessages(
    settings.afterMessages,
  );
  const minimumCharacters = normalizeMessageCompressionMinimumCharacters(
    settings.minimumCharacters,
  );
  const candidates: UserChatMessage[] = [];
  let regularMessagesAfter = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!COMPRESSIBLE_MESSAGE_TYPES.has(message.type)) continue;

    if (
      regularMessagesAfter >= afterMessages &&
      message.compression === undefined &&
      (message.content?.length ?? 0) >= minimumCharacters
    ) {
      candidates.push(message);
    }

    regularMessagesAfter++;
  }

  return candidates.reverse();
};

const buildMessageCompressionRequest = (
  message: UserChatMessage,
  prompts: SystemPrompts,
) => [
  toSystemMessage(
    prompts.messageCompressionPrompt ||
      DEFAULT_SYSTEM_PROMPTS.messageCompressionPrompt,
  ),
  toUserMessage(
    [
      `Message role: ${formatMessageRole(message.type)}`,
      "",
      "Source message:",
      message.content ?? "",
    ].join("\n"),
  ),
];

const formatMessageRole = (type: UserChatMessage["type"]): string => {
  if (type === "user-message") return "user";
  if (type === "assistant") return "assistant";
  return "system";
};
