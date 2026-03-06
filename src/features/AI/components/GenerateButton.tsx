import React from "react";
import { Button } from "@mantine/core";
import type { ButtonProps } from "@mantine/core";
import { LuSparkles } from "react-icons/lu";
import { Theme } from "../../../components/Theme";

interface GenerateButtonProps extends Omit<ButtonProps, "leftSection"> {
  onClick?: () => void | Promise<void>;
  leftSection?: React.ReactNode;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  children = "Generate",
  leftSection,
  ...props
}) => (
  <Button
    variant="default"
    leftSection={
      leftSection ?? <LuSparkles size={16} color={Theme.chatSettings.primary} />
    }
    {...props}
  >
    {children}
  </Button>
);
