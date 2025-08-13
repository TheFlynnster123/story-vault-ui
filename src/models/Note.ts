export interface Note {
  id: string;
  type: NoteType;
  name: string;
  prompt: string;
  content?: string;
}

type NoteType = "planning";
