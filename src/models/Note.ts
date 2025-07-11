import type { PlanningNoteTemplate } from "./PlanningNoteTemplate";

export interface Note {
  template: PlanningNoteTemplate;
  content: string;
}
