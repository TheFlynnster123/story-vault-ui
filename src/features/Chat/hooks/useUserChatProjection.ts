import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type {
  ReasoningChatMessage,
  UserChatMessage,
} from "../../../services/CQRS/UserChatProjection";
import { DEFAULT_REASONING_RETENTION_MESSAGES } from "../services/Chat/ChatSettings";

interface UseUserChatProjectionReturn {
  messages: UserChatMessage[];
  getChapterMessages: (chapterId: string) => UserChatMessage[];
}

export const useUserChatProjection = (
  chatId: string,
): UseUserChatProjectionReturn => {
  const [messages, setMessages] = useState<UserChatMessage[]>([]);

  useEffect(() => {
    const projection = d.UserChatProjection(chatId);
    const settingsService = d.ChatSettingsService(chatId);
    const updateState = async () => {
      const [messages, settings] = await Promise.all([
        projection.GetMessages(),
        settingsService.Get(),
      ]);
      setMessages(
        applyReasoningDisabledState(
          messages,
          settings?.reasoningExpiresAfterMessages ??
            DEFAULT_REASONING_RETENTION_MESSAGES,
        ),
      );
    };

    const unsubscribeProjection = projection.subscribe(updateState);
    const unsubscribeSettings = settingsService.subscribe(updateState);

    void updateState();

    return () => {
      unsubscribeProjection();
      unsubscribeSettings();
    };
  }, [chatId]);

  return {
    messages: messages,
    getChapterMessages: (chapterId: string) =>
      d.UserChatProjection(chatId).getChapterMessages(chapterId),
  };
};

const applyReasoningDisabledState = (
  messages: UserChatMessage[],
  expiresAfterMessages: number | null,
): UserChatMessage[] => {
  if (expiresAfterMessages === null) return messages;

  return messages.map((message, index) => {
    if (message.type !== "reasoning") return message;

    const disabled =
      countRegularMessagesAfter(messages, index) >= expiresAfterMessages;
    const reasoning = message as ReasoningChatMessage;

    return {
      ...reasoning,
      data: {
        ...reasoning.data,
        disabled,
      },
    };
  });
};

const countRegularMessagesAfter = (
  messages: UserChatMessage[],
  index: number,
): number =>
  messages
    .slice(index + 1)
    .filter(
      (message) =>
        message.type === "user-message" ||
        message.type === "system-message" ||
        message.type === "assistant",
    ).length;
