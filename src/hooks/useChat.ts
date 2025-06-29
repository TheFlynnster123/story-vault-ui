import type { ChatPage } from "../models/ChatPage";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState } from "react";

interface UseChatReturn {
  pages: ChatPage[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
  isLoadingHistory: boolean;
  storyNote: string;
}

interface UseChatProps {
  chatId: string;
  useStoryNotes?: boolean;
}

const STORY_NOTE_PROMPT =
  "Pause our story. Respond by simply filling out these Story Notes ---- 1. Summarize Key Events - What is the most important information to keep track of here? Create an efficient bulleted list. 2. What direction does the user seem to be taking the story? What do you think they like? Have they specifically indicated any guidelines for the system? Create an efficient bulleted list. 3. Come up with a few sentences describing two novel directions the story could go in, intuiting user preference and the continuity of the story?";

export const useChat = ({
  chatId,
  useStoryNotes = false,
}: UseChatProps): UseChatReturn => {
  const { grokChatApiClient } = useGrokChatAPI();

  const { pages, addMessage, isLoadingHistory, getMessageList } = useChatPages({
    chatId,
  });

  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [storyNote, setStoryNote] = useState<string>("");

  const submitMessage = useCallback(
    async (userMessageText: string) => {
      if (!chatId || !grokChatApiClient) {
        console.error("ChatId or Grok API client not available.");
        return;
      }

      setIsSendingMessage(true);

      // Clear current story note so it won't be attached to subsequent messages
      // until the new one is ready
      const currentStoryNote = storyNote;
      setStoryNote("");

      try {
        await addMessage(toUserMessage(userMessageText));

        // Use the story note that was available when this request started
        const messageListForRequest = currentStoryNote
          ? [...getMessageList(), toSystemMessage(currentStoryNote)]
          : getMessageList();

        const systemReplyText = await grokChatApiClient.postChat(
          messageListForRequest
        );

        await addMessage(toSystemMessage(systemReplyText));

        // Set isSendingMessage to false immediately after system response
        // so user can send new messages without waiting for story note
        setIsSendingMessage(false);

        // Generate story note in background if enabled
        if (useStoryNotes) {
          // Run story note generation asynchronously without blocking
          (async () => {
            try {
              const currentMessageList = getMessageList();
              let promptWithReference = STORY_NOTE_PROMPT;

              if (currentStoryNote) {
                promptWithReference += `\n\n---- For reference, here is an outdated story note from a few messages ago: ${currentStoryNote}`;
              }

              const storyNoteMessageList = [
                ...currentMessageList,
                toSystemMessage(promptWithReference),
              ];

              const generatedStoryNote = await grokChatApiClient.postChat(
                storyNoteMessageList
              );

              // Only set the story note if we're not already sending another message
              // (which would have cleared the story note again)
              if (!isSendingMessage) {
                setStoryNote(generatedStoryNote);
              }
            } catch (storyNoteError) {
              console.error("Error generating story note:", storyNoteError);
              // Don't block the main flow if story note generation fails
            }
          })();
        }
      } catch (error) {
        console.error("Error during message submission or Grok call:", error);
        setIsSendingMessage(false);
      }
    },
    [
      chatId,
      grokChatApiClient,
      addMessage,
      getMessageList,
      useStoryNotes,
      storyNote,
    ]
  );

  return {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
    storyNote,
  };
};

function toUserMessage(userMessageText: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: userMessageText,
  };
}

function toSystemMessage(systemReplyText: string): Message {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}
