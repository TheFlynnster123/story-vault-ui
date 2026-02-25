import { useState, useCallback } from "react";

/**
 * Custom hook to manage chat input expansion state
 * Chat input expands when focused, collapses when focus leaves or action is taken
 */
export const useChatInputExpansion = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const minimize = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    expand,
    minimize,
  };
};

// Keep the old export for backwards compatibility temporarily
export const useExpandableTextarea = useChatInputExpansion;
