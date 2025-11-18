export interface Message {
  id: string;
  role: "user" | "system" | "assistant" | "civit-job" | "delete";
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
