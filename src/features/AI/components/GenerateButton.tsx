import React from "react";
import { Button } from "@mantine/core";
import type { ButtonProps } from "@mantine/core";
import { LuSparkles } from "react-icons/lu";
import { Theme } from "../../../components/Theme";

interface GenerateButtonProps extends Omit<ButtonProps, "leftSection"> {
  onClick?: () => void | Promise<void>;
  leftSection?: React.ReactNode;
}

export const GenerateButton = React.forwardRef<
  HTMLButtonElement,
  GenerateButtonProps
>(({ children = "Generate", leftSection, ...props }, ref) => (
  <Button
    ref={ref}
    variant="default"
    leftSection={
      leftSection ?? <LuSparkles size={16} color={Theme.chatSettings.primary} />
    }
    {...props}
  >
    {children}
  </Button>
));

GenerateButton.displayName = "GenerateButton";
