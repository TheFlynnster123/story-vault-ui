import styled, { css } from "styled-components";
import { Loader } from "@mantine/core";
import { useChatSettings } from "../../hooks/useChatSettings";

interface IChatListItemProps {
  chatId: string;
  onClick: () => any;
  gradientIndex: number;
}

export const ChatListItem = ({
  chatId,
  onClick,
  gradientIndex,
}: IChatListItemProps) => {
  const {
    chatSettings,
    backgroundPhotoBase64,
    isBackgroundPhotoLoading,
    isLoading,
  } = useChatSettings(chatId);

  const hasBackgroundImage = !!backgroundPhotoBase64;
  const isCardLoading = isLoading || isBackgroundPhotoLoading;
  const title = chatSettings?.chatTitle ?? chatId;

  if (isCardLoading) {
    return (
      <StyledChatListItem
        key={chatId}
        $isLoading
        $gradientIndex={gradientIndex}
      >
        <Loader color="white" size="sm" />
      </StyledChatListItem>
    );
  }

  return (
    <StyledChatListItem
      key={chatId}
      onClick={() => onClick()}
      $hasBackgroundImage={hasBackgroundImage}
      $gradientIndex={gradientIndex}
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
  $hasBackgroundImage?: boolean;
  $isLoading?: boolean;
  $gradientIndex: number;
}>`
  padding: 10px 15px;
  aspect-ratio: 1;
  margin: 0;
  border-radius: 5px;
  cursor: pointer;
  color: white;
  transition:
    background-color 0.2s ease-in-out,
    transform 0.2s ease-in-out;
  background-color: rgba(0, 0, 0, 0.7);
  position: relative;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  height: auto;
  max-height: 40vh;
  max-width: 40vh;
  box-sizing: border-box;

  &:hover {
    background-color: black;
    transform: scale(1.02);
  }

  ${(props) =>
    !props.$hasBackgroundImage &&
    !props.$isLoading &&
    css`
      background: ${getTitleGradient(props.$gradientIndex)};

      &:hover {
        filter: brightness(1.08);
      }
    `}

  ${(props) =>
    props.$isLoading &&
    css`
      cursor: default;
      background: ${getLoadingGradient(props.$gradientIndex)};
      background-size: 220% 220%;
      animation: loading-gradient 1.8s ease-in-out infinite;

      &:hover {
        filter: none;
        transform: none;
      }
    `}

  ${(props) =>
    props.$hasBackgroundImage &&
    css`
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

  @keyframes loading-gradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const loadingGradients = [
  "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.34) 50%, rgba(255, 255, 255, 0.12) 100%)",
  "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.28) 45%, rgba(255, 255, 255, 0.14) 100%)",
  "linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.38) 55%, rgba(255, 255, 255, 0.1) 100%)",
];

const titleGradients = [
  "linear-gradient(135deg, #0f766e 0%, #2563eb 100%)",
  "linear-gradient(135deg, #9d174d 0%, #f97316 100%)",
  "linear-gradient(135deg, #166534 0%, #0891b2 100%)",
  "linear-gradient(135deg, #7c2d12 0%, #be123c 100%)",
  "linear-gradient(135deg, #4338ca 0%, #a21caf 100%)",
  "linear-gradient(135deg, #365314 0%, #ca8a04 100%)",
];

const getLoadingGradient = (index: number): string =>
  loadingGradients[index % loadingGradients.length];

const getTitleGradient = (index: number): string =>
  titleGradients[index % titleGradients.length];
