import React from "react";
import { Button } from "@mantine/core";
import { FlowStyles } from "./FlowStyles";

interface FlowButtonProps {
  onClick: () => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTouchStart?: (event: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchEnd?: (event: React.TouchEvent<HTMLButtonElement>) => void;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  children: React.ReactNode;
}

export const FlowButton: React.FC<FlowButtonProps> = ({
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  leftSection,
  rightSection,
  children,
}) => (
  <Button
    variant="subtle"
    color="gray"
    fullWidth
    justify="flex-start"
    leftSection={leftSection}
    rightSection={rightSection}
    onClick={onClick}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onMouseLeave={onMouseLeave}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    styles={{
      root: {
        backgroundColor: FlowStyles.buttonBackground,
        color: FlowStyles.text,
        "&:hover": {
          backgroundColor: FlowStyles.buttonHover,
        },
      },
    }}
  >
    {children}
  </Button>
);
