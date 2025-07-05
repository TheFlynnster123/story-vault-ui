import { useState, useEffect, useCallback } from "react";
import { useNoteAPI } from "./useNoteAPI";
import {
  ChatSettingsNote,
  type ChatSettings,
} from "../models/ChatSettingsNote";

interface ChatSettingsMap {
  [chatId: string]: ChatSettings | null;
}

interface UseChatSettingsReturn {
  chatSettings: ChatSettingsMap;
  loadChatSettings: (chatId: string) => Promise<ChatSettings | null>;
  createChatSettings: (chatId: string, settings: ChatSettings) => Promise<void>;
  getChatTitle: (chatId: string) => string;
  isLoading: boolean;
}

export const useChatSettings = (): UseChatSettingsReturn => {
  const [chatSettings, setChatSettings] = useState<ChatSettingsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const noteAPI = useNoteAPI();

  const loadChatSettings = useCallback(
    async (chatId: string): Promise<ChatSettings | null> => {
      if (!noteAPI || !chatId) return null;

      // Return cached settings if already loaded
      if (chatSettings[chatId] !== undefined) {
        return chatSettings[chatId];
      }

      try {
        setIsLoading(true);
        const chatSettingsNote = new ChatSettingsNote(chatId, noteAPI);
        await chatSettingsNote.load();

        const settings: ChatSettings = {
          chatTitle: chatSettingsNote.getChatTitle(),
          context: chatSettingsNote.getContext(),
        };

        setChatSettings((prev) => ({
          ...prev,
          [chatId]: settings,
        }));

        return settings;
      } catch (error) {
        console.error(`Failed to load chat settings for ${chatId}:`, error);
        // Mark as null to indicate no settings exist
        setChatSettings((prev) => ({
          ...prev,
          [chatId]: null,
        }));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [noteAPI, chatSettings]
  );

  const createChatSettings = useCallback(
    async (chatId: string, settings: ChatSettings): Promise<void> => {
      if (!noteAPI || !chatId) {
        throw new Error("NoteAPI or chatId not available");
      }

      try {
        setIsLoading(true);
        const chatSettingsNote = new ChatSettingsNote(
          chatId,
          noteAPI,
          settings
        );
        await chatSettingsNote.save();

        setChatSettings((prev) => ({
          ...prev,
          [chatId]: settings,
        }));
      } catch (error) {
        console.error(`Failed to create chat settings for ${chatId}:`, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [noteAPI]
  );

  const getChatTitle = useCallback(
    (chatId: string): string => {
      const settings = chatSettings[chatId];
      if (settings?.chatTitle) {
        return settings.chatTitle;
      }
      return chatId; // Fallback to chatId if no title
    },
    [chatSettings]
  );

  return {
    chatSettings,
    loadChatSettings,
    createChatSettings,
    getChatTitle,
    isLoading,
  };
};
