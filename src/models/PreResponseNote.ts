import type { GrokChatAPI } from "../clients/GrokChatAPI";
import { ResponseNote } from "./ResponseNote";

/**
 * Abstract base class for notes that are generated BEFORE a response is created.
 * These notes are used to provide context and planning for the response generation.
 * They don't need saving/loading functionality as they are generated fresh each time.
 */
export abstract class PreResponseNote extends ResponseNote {
  constructor(grokClient: GrokChatAPI, initialContent: string = "") {
    super(grokClient, initialContent);
  }
}
