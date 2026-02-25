import React from "react";
import { Button } from "@mantine/core";
import type { ButtonProps } from "@mantine/core";
import { LuMegaphone } from "react-icons/lu";
import { Theme } from "../../../components/Common/Theme";

interface EditPromptButtonProps extends Omit<ButtonProps, "leftSection"> {
  onClick?: () => void;
  leftSection?: React.ReactNode;
}

export const EditPromptButton: React.FC<EditPromptButtonProps> = ({
  children = "Edit Prompt",
  leftSection,
  ...props
}) => (
  <Button
    variant="subtle"
    size="xs"
    leftSection={
      leftSection ?? (
        <LuMegaphone size={14} color={Theme.chatSettings.primary} />
      )
    }
    {...props}
  >
    {children}
  </Button>
);
