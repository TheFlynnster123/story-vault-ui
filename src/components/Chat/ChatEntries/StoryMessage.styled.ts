import styled from "styled-components";
import { Theme } from "../../Common/Theme";

export const StoryMessageContainer = styled.div`
  padding: 1rem;
  background: linear-gradient(
    135deg,
    ${Theme.chatSettings.backgroundPrimary} 0%,
    ${Theme.chatSettings.backgroundSecondary} 100%
  );
  border-radius: 8px;
  margin-top: 1rem;
`;

export const StoryMessageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: ${Theme.chatSettings.headerText};
  margin-bottom: 1rem;
`;

export const StoryDivider = styled.hr`
  border: none;
  border-top: 1px solid ${Theme.chatSettings.border};
  margin: 0 0 1rem 0;
`;

export const StoryContent = styled.div`
  white-space: pre-wrap;
  margin-bottom: 1rem;
  line-height: 1.6;
`;

export const StoryButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;
