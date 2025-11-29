import styled from "styled-components";
import type { ChapterChatMessage } from "../../../cqrs/UserChatProjection";

const DirectionSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(46, 46, 53, 0.7);
  border-left: 3px solid rgba(2, 3, 68, 1);
  border-radius: 4px;
`;

const DirectionLabel = styled.div`
  font-weight: 600;
  color: rgba(159, 181, 255, 1);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const DirectionText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

interface INextChapterDirectionProps {
  chapter: ChapterChatMessage;
}

export const NextChapterDirection = ({
  chapter,
}: INextChapterDirectionProps) => {
  const nextChapterDirection = chapter?.data?.nextChapterDirection;

  return (
    <>
      {nextChapterDirection && nextChapterDirection.trim() && (
        <DirectionSection>
          <DirectionLabel>📍 Next Chapter Direction</DirectionLabel>
          <DirectionText>{nextChapterDirection}</DirectionText>
        </DirectionSection>
      )}
    </>
  );
};
