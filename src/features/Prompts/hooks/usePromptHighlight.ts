import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

export const usePromptHighlight = () => {
  const location = useLocation();
  const [highlightedPrompt, setHighlightedPrompt] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      setHighlightedPrompt(hash);
      setTimeout(() => scrollToElement(hash), 100);
      setTimeout(() => setHighlightedPrompt(null), 3000);
    }
  }, [location.hash]);

  return highlightedPrompt;
};
