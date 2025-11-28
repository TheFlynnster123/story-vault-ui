import styled from 'styled-components';

export const NoteItemCard = styled.div`
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;

  &:nth-child(even) {
    background-color: #00ccff25;
  }
`;

export const NoteItemHeader = styled.div`
  h2, h3 {
    margin: 0;
    font-size: 14px;
  }
`;

export const NoteItemContent = styled.div`
  padding: 12px;

  p {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
`;
