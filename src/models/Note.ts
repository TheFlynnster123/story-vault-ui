export class Note {
  chatId: string;
  noteName: string;
  content: string;

  constructor(chatId: string, noteName: string, content: string) {
    this.chatId = chatId;
    this.noteName = noteName;

    this.content = content;
  }
}
