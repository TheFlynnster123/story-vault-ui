import styled from "styled-components";

export const ChapterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--mantine-color-dark-4);
  border-radius: 8px;
  padding: 8px;
`;

export const ChapterCheckboxRow = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 2px;

  &:hover {
    background-color: var(--mantine-color-dark-5);
  }
`;

export const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  user-select: none;
`;

export const ChapterTitle = styled.span`
  flex: 1;
  font-size: 14px;
`;

export const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  color: var(--mantine-color-dimmed);

  &:hover {
    color: var(--mantine-color-text);
  }
`;

export const ChapterContent = styled.div`
  padding: 8px 12px 12px 32px;
  font-size: 13px;
  color: var(--mantine-color-dimmed);
  white-space: pre-wrap;
  line-height: 1.6;
  border-top: 1px solid var(--mantine-color-dark-4);
  margin-top: 4px;
`;
