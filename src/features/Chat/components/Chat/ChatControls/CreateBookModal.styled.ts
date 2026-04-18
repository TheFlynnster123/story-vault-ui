import styled from "styled-components";

export const ChapterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--mantine-color-dark-4);
  border-radius: 8px;
  padding: 4px;
`;

export const ChapterRow = styled.div<{
  $isSelected: boolean;
  $isStart: boolean;
  $isEnd: boolean;
}>`
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: background-color 0.15s ease;

  background-color: ${({ $isSelected }) =>
    $isSelected ? "var(--mantine-color-blue-light)" : "transparent"};

  border-left: 3px solid
    ${({ $isStart, $isEnd, $isSelected }) =>
      $isStart
        ? "var(--mantine-color-green-6)"
        : $isEnd
          ? "var(--mantine-color-red-6)"
          : $isSelected
            ? "var(--mantine-color-blue-6)"
            : "transparent"};

  &:hover {
    background-color: ${({ $isSelected }) =>
      $isSelected
        ? "var(--mantine-color-blue-light-hover)"
        : "var(--mantine-color-dark-5)"};
  }
`;

export const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  user-select: none;
  min-width: 0;
`;

export const ChapterTitle = styled.span`
  flex: 1;
  font-size: 14px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BoundaryBadge = styled.span<{ $type: "start" | "end" }>`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  background-color: ${({ $type }) =>
    $type === "start"
      ? "var(--mantine-color-green-9)"
      : "var(--mantine-color-red-9)"};

  color: ${({ $type }) =>
    $type === "start"
      ? "var(--mantine-color-green-1)"
      : "var(--mantine-color-red-1)"};
`;

export const ExpandButton = styled.button`
  flex-shrink: 0;
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
  padding: 4px 10px 10px 24px;
  font-size: 13px;
  color: var(--mantine-color-dimmed);
  white-space: pre-wrap;
  line-height: 1.5;
  border-top: 1px solid var(--mantine-color-dark-4);
`;
