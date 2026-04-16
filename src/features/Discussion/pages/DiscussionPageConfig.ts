import type { ReactNode } from "react";

/**
 * Visual configuration for a discussion page variant.
 * Controls theming, labels, and icons.
 */
export interface DiscussionPageConfig {
  /** Primary accent color (e.g. Theme.plan.primary) */
  primaryColor: string;
  /** Border color for the divider and input */
  borderColor: string;
  /** Background for assistant message bubbles */
  assistantBubbleBackground: string;
  /** Mantine color name for buttons and action icons (e.g. "teal", "yellow", "green") */
  accentColor: string;
  /** Icon displayed in the header */
  icon: ReactNode;
  /** Title shown in the header (e.g. "Discuss Plan") */
  title: string;
  /** Description text below the title */
  description: string;
  /** Placeholder text for the input field */
  inputPlaceholder: string;
  /** Label for the generate button */
  generateButtonLabel: string;
  /** Empty state text when no messages */
  emptyStateText: string;
}
