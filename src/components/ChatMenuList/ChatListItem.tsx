import styled, { css } from "styled-components";
import { useChatSettings } from "../Chat/useChatSettings";

interface IChatListItemProps {
  chatId: string;
  onClick: () => any;
}

export const ChatListItem = ({ chatId, onClick }: IChatListItemProps) => {
  const { chatSettings, backgroundPhotoBase64, isLoading } =
    useChatSettings(chatId);

  const hasBackgroundImage = !!backgroundPhotoBase64;
  const title = chatSettings?.chatTitle ?? chatId;

  if (isLoading) {
    return (
      <StyledChatListItem key={chatId}>
        <StyledChatListItemTitle>Loading...</StyledChatListItemTitle>
      </StyledChatListItem>
    );
  }

  return (
    <StyledChatListItem
      key={chatId}
      hasBackgroundImage={hasBackgroundImage}
      onClick={() => onClick()}
      style={
        backgroundPhotoBase64
          ? getBackgroundImageStyles(backgroundPhotoBase64)
          : undefined
      }
    >
      <StyledChatListItemTitle>{title}</StyledChatListItemTitle>
    </StyledChatListItem>
  );
};

const getBackgroundImageStyles = (backgroundPhotoBase64: string) => ({
  backgroundImage: `url(${backgroundPhotoBase64})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
});

const StyledChatListItemTitle = styled.div`
  background-color: transparent;
  color: white;
  padding: 0;
  border-radius: 0;
  backdrop-filter: none;
  position: static;
  transform: none;
  max-width: none;
`;

const StyledChatListItem = styled.div<{
  hasBackgroundImage?: boolean;
}>`
  padding: 10px 15px;
  margin-bottom: 1rem;
  border-radius: 5px;
  cursor: pointer;
  color: white;
  transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
  background-color: rgba(0, 0, 0, 0.7);
  position: relative;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &:hover {
    background-color: black;
  }

  ${(props) =>
    props.hasBackgroundImage &&
    css`
      padding: 0;
      aspect-ratio: 1;
      margin: 0 auto 16px auto;
      width: 67vw;
      height: 67vw;
      max-height: 40vh;
      max-width: 40vh;

      &:hover {
        background-color: transparent;
        transform: scale(1.02);
      }

      & ${StyledChatListItemTitle} {
        background-color: rgba(0, 0, 0, 0.3);
        padding: 8px 16px;
        border-radius: 10px;
        font-weight: 500;
        text-align: center;
        backdrop-filter: blur(5px);
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        max-width: calc(100% - 20px);
        word-wrap: break-word;
        z-index: 1;
      }

      &:hover ${StyledChatListItemTitle} {
        background-color: rgba(0, 0, 0, 0.8);
      }
    `}
`;
