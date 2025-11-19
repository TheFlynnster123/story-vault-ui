export interface Message {
  role:
    | "user"
    | "system"
    | "assistant"
    | "civit-job"
    | "delete"
    | "edit"
    | "chapter"
    | "chapter-edit";

  id: string;
  content: string;
}

export interface CivitJobMessage extends Message {
  role: "civit-job";
  content: string;
}

export interface CivitJobMessageContent {
  jobId: string;
  prompt: string;
}

export interface DeleteMessage extends Message {
  role: "delete";
  content: string;
}

export interface DeleteMessageContent {
  messageId: string;
}

export interface EditMessage extends Message {
  role: "edit";
  content: string;
}

export interface EditMessageContent {
  messageId: string;
  newContent: string;
}
