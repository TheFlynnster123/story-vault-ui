import { useState, useCallback } from "react";
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
  updateChatSettings: (chatId: string, settings: ChatSettings) => void;
  isLoading: boolean;
}

export const useChatSettings = (): UseChatSettingsReturn => {
  const [chatSettings, setChatSettings] = useState<ChatSettingsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const noteAPI = useNoteAPI();

  const loadChatSettings = useCallback(
    async (chatId: string): Promise<ChatSettings | null> => {
      if (!noteAPI || !chatId) return null;

      const getCurrentSettings = () => {
        let currentSettings: ChatSettingsMap = {};
        setChatSettings((prev) => {
          currentSettings = prev;
          return prev;
        });
        return currentSettings;
      };

      const currentSettings = getCurrentSettings();

      if (currentSettings[chatId] !== undefined) {
        return currentSettings[chatId];
      }

      try {
        setIsLoading(true);
        const chatSettingsNote = new ChatSettingsNote(chatId, noteAPI);
        await chatSettingsNote.load();

        const settings: ChatSettings = {
          chatTitle: chatSettingsNote.getChatTitle(),
          context: chatSettingsNote.getContext(),
          backgroundPhotoBase64: chatSettingsNote.getBackgroundPhotoBase64(),
        };

        setChatSettings((prev) => ({
          ...prev,
          [chatId]: settings,
        }));

        return settings;
      } catch (error) {
        console.error(`Failed to load chat settings for ${chatId}:`, error);
        setChatSettings((prev) => ({
          ...prev,
          [chatId]: null,
        }));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [noteAPI]
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

  const updateChatSettings = useCallback(
    (chatId: string, settings: ChatSettings): void => {
      setChatSettings((prev) => ({
        ...prev,
        [chatId]: settings,
      }));
    },
    []
  );

  return {
    chatSettings,
    loadChatSettings,
    createChatSettings,
    updateChatSettings,
    isLoading,
  };
};
