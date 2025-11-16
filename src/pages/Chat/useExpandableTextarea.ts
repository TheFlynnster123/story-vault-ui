import { useState, useCallback } from "react";

/**
 * Custom hook to manage expandable textarea state
 * Textarea collapses to single line when not focused, expands when clicked
 */
export const useExpandableTextarea = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    handleFocus,
    handleBlur,
  };
};
