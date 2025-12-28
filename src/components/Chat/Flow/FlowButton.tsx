import React from "react";
import { Button } from "@mantine/core";
import { FlowStyles } from "./FlowStyles";

interface FlowButtonProps {
  onClick: () => void;
  leftSection?: React.ReactNode;
  children: React.ReactNode;
}

export const FlowButton: React.FC<FlowButtonProps> = ({
  onClick,
  leftSection,
  children,
}) => (
  <Button
    variant="subtle"
    color="gray"
    fullWidth
    justify="flex-start"
    leftSection={leftSection}
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
