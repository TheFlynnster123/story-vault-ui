import { d } from "../../app/Dependencies/Dependencies";
import type { Note } from "../../models/Note";

const NOTES_BLOB_NAME = "notes";

export const getNotesQueryKey = (chatId: string) => ["notes", chatId];

export class NotesService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = async (): Promise<Note[]> =>
    (await d.QueryClient().ensureQueryData({
      queryKey: getNotesQueryKey(this.chatId),
      queryFn: async () => await this.fetchNotes(),
    })) as Note[];

  getAllNotes = async (): Promise<Note[]> => {
    return await this.get();
  };

  getPlanningNotes = async (): Promise<Note[]> => {
    const notes = await this.get();
    return notes.filter((note) => note.type === "planning");
  };

  save = async (notes: Note[]): Promise<void> => {
    const blobContent = JSON.stringify(notes);
    await d.BlobAPI().saveBlob(this.chatId, NOTES_BLOB_NAME, blobContent);
  };

  fetchNotes = async (): Promise<Note[]> => {
    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, NOTES_BLOB_NAME);

      if (!blobContent) return [];

      return JSON.parse(blobContent) as Note[];
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blob not found")) return [];

      d.ErrorService().log("Failed to fetch notes", e);
      return [];
    }
  };
}
