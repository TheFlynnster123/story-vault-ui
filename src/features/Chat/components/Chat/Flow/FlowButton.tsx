import React from "react";
import { Button } from "@mantine/core";
import { FlowStyles } from "./FlowStyles";

interface FlowButtonProps {
  onClick: () => void;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  children: React.ReactNode;
}

export const FlowButton: React.FC<FlowButtonProps> = ({
  onClick,
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
