export interface Note {
  id: string;
  type: NoteType;
  name: string;
  requestPrompt: string;
  updatePrompt?: string;
  content: string;
}

type NoteType = "planning" | "refinement" | "analysis";
