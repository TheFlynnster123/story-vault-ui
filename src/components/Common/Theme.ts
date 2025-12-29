/**
 * Chat Theme Configuration
 *
 * Centralized theme for chat-related styling including
 * colors, transparency, and visual effects.
 */

export const Theme = {
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

  /** Colors for chat settings UI elements - Purple/Violet theme */
  chatSettings: {
    /** Primary purple color */
    primary: "rgba(138, 43, 226, 1)",
    /** Secondary darker purple */
    secondary: "rgba(75, 0, 130, 1)",
    /** Border color for settings elements */
    border: "rgba(138, 43, 226, 0.5)",
    /** Text color for headers */
    headerText: "rgba(255, 255, 255, 1)",
    /** Transparent version for backgrounds */
    backgroundPrimary: "rgba(138, 43, 226, 0.8)",
    backgroundSecondary: "rgba(75, 0, 130, 0.8)",
  },

  /** Colors for plan UI elements - Teal/Cyan theme */
  plan: {
    /** Primary teal color */
    primary: "rgba(0, 188, 212, 1)",
    /** Secondary darker teal */
    secondary: "rgba(0, 131, 143, 1)",
    /** Border color for plan elements */
    border: "rgba(0, 188, 212, 0.5)",
    /** Text color for headers */
    headerText: "rgba(255, 255, 255, 1)",
    /** Transparent version for backgrounds */
    backgroundPrimary: "rgba(0, 188, 212, 0.8)",
    backgroundSecondary: "rgba(0, 131, 143, 0.8)",
  },

  /** Colors for memories UI elements - Rose/Pink theme */
  memories: {
    /** Primary rose color */
    primary: "rgba(236, 72, 153, 1)",
    /** Secondary darker rose */
    secondary: "rgba(190, 24, 93, 1)",
    /** Border color for memory elements */
    border: "rgba(236, 72, 153, 0.5)",
    /** Text color for headers */
    headerText: "rgba(255, 255, 255, 1)",
    /** Transparent version for backgrounds */
    backgroundPrimary: "rgba(236, 72, 153, 0.3)",
    backgroundSecondary: "rgba(190, 24, 93, 0.3)",
  },

  /** Colors for different message types */
  messages: {
    /** User message colors */
    user: {
      background: "rgba(0, 195, 255, 1)",
      text: "#ffffff",
    },
    /** Assistant message colors */
    assistant: {
      background: "rgba(0, 2, 126, 1)",
      text: "#ffffff",
    },
  },

  /** Transparency settings for chat entries */
  chatEntry: {
    /** Default transparency for text-based messages (0-1) */
    transparency: 0.8,
  },

  /** Common page styling for frosted glass effect */
  page: {
    /** Background for paper/card elements */
    paperBackground: "rgba(20, 20, 20, 0.85)",
    /** Backdrop blur for frosted glass effect */
    backdropBlur: "blur(12px)",
    /** Text color for dark theme */
    text: "#ffffff",
    /** Muted text color */
    textMuted: "rgba(255, 255, 255, 0.7)",
  },
} as const;

export type Theme = typeof Theme;
