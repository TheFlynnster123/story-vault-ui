export class Blob {
  chatId: string;
  blobName: string;
  content: string;

  constructor(chatId: string, blobName: string, content: string) {
    this.chatId = chatId;
    this.blobName = blobName;

    this.content = content;
  }
}
