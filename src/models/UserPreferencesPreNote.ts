import { PreResponseNote } from "./PreResponseNote";

/**
 * PreResponseNote implementation for user preferences.
 * Loads and provides user preference context before generating responses.
 */
export class UserPreferencesPreNote extends PreResponseNote {
  getNoteName(): string {
    return "user-preferences";
  }

  getContextLabel(): string {
    return "User Preferences";
  }
}
