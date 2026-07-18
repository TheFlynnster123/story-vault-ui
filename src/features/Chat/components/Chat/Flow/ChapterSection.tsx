import React from "react";
import { useChapterCreation } from "../ChatControls/ChapterCreationContext";
import { CompressToChapterButton } from "./CompressToChapterButton";

interface ChapterSectionProps {
  chatId: string;
}

export const ChapterSection: React.FC<ChapterSectionProps> = () => {
  const chapter = useChapterCreation();

  return (
    <>
      <CompressToChapterButton onClick={chapter.handleOpenModal} />
    </>
  );
};
