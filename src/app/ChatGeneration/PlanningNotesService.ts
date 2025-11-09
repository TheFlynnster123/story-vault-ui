import type { ChatSettings, Note } from "../../models";
import type { Message } from "../../pages/Chat/ChatMessage";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

export class PlanningNotesService {
  chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  public generateUpdatedPlanningNotes = async (
    chatMessages: Message[]
  ): Promise<Note[]> => {
    const planningNotes = await d.NotesService(this.chatId).getPlanningNotes();

    const processPromises = planningNotes.map(
      async (note) => await this.generatePlanningNoteContent(note, chatMessages)
    );

    return await Promise.all(processPromises);
  };

  generatePlanningNoteContent = async (note: Note, chatMessages: Message[]) => {
    const chatSettings = await d.ChatSettingsService(this.chatId).get();

    const promptMessages: Message[] = [
      ...this.buildStoryMessages(chatSettings),
      ...chatMessages,
      toSystemMessage(
        `#${note.name}\r\n
          ~ Consider the chat history above, and generate a note  note in Markdown without preamble or additional text ~
          ${note.prompt}
          \r\n
          =====
          \r\n`
      ),
    ];

    const response = await d.GrokChatAPI().postChat(promptMessages);

    return { ...note, content: response };
  };

  buildStoryMessages = (chatSettings?: ChatSettings) => {
    if (!chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${chatSettings.story}`)];
  };
}
