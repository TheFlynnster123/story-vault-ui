/**
 * Chat Theme Configuration
 *
 * Centralized theme for chat-related styling including
 * colors, transparency, and visual effects.
 */

export const chatTheme = {
  /** Colors for chapter-related UI elements */
  chapter: {
    /** Primary golden color for chapters */
    primary: "rgba(199, 152, 0, 1)",
    /** Secondary darker golden color */
    secondary: "rgba(126, 92, 0, 1)",
    /** Border color for chapter elements */
    border: "rgba(97, 71, 0, 0.5)",
    /** Text color for chapter headers */
    headerText: "rgba(58, 52, 1, 1)",
    /** Transparent version for backgrounds */
    backgroundPrimary: "rgba(199, 152, 0, 0.8)",
    backgroundSecondary: "rgba(126, 92, 0, 0.8)",
  },

  /** Colors for different message types */
  messages: {
    /** User message colors */
    user: {
      background: "rgba(0, 195, 255, 0.726)",
      text: "#ffffff",
    },
    /** Assistant message colors */
    assistant: {
      background: "rgba(0, 2, 126, 0.733)",
      text: "#ffffff",
    },
  },

  /** Transparency settings for chat entries */
  chatEntry: {
    /** Default transparency for text-based messages (0-1) */
    transparency: 0.8,
  },

  /** Flow accordion and control colors */
  flow: {
    background: "rgba(0, 0, 0, 0.8)",
    controlBackground: "rgba(30, 30, 30, 0.95)",
    controlHover: "rgba(50, 50, 50, 0.95)",
    contentBackground: "rgba(20, 20, 20, 0.95)",
    buttonBackground: "rgba(40, 40, 40, 0.6)",
    buttonHover: "rgba(60, 60, 60, 0.8)",
    border: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff",
  },
} as const;

export type ChatTheme = typeof chatTheme;
