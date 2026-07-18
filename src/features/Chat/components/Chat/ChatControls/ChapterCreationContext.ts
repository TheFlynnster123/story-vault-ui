import { createContext, useContext } from "react";
import type { useAddChapter } from "./useAddChapter";

export const ChapterCreationContext = createContext<ReturnType<
  typeof useAddChapter
> | null>(null);

export const useChapterCreation = () => {
  const controller = useContext(ChapterCreationContext);
  if (!controller) {
    throw new Error("useChapterCreation requires ChapterCreationProvider");
  }
  return controller;
};
