import { ActionIcon, Indicator, Tooltip } from "@mantine/core";

interface AsyncActionTheme {
  primary: string;
  secondary: string;
  border: string;
}

interface AsyncActionControlProps {
  label: string;
  icon: React.ReactNode;
  theme: AsyncActionTheme;
  onClick: () => void;
}

export const AsyncActionControl: React.FC<AsyncActionControlProps> = ({
  label,
  icon,
  theme,
  onClick,
}) => (
  <Tooltip label={label} position="left" withArrow>
    <Indicator
      color="red"
      size={11}
      offset={3}
      position="top-end"
      withBorder
      processing
    >
      <ActionIcon
        aria-label={label}
        onClick={onClick}
        size="xl"
        variant="light"
        styles={{
          root: {
            color: theme.primary,
            backgroundColor: theme.secondary,
            border: `1px solid ${theme.border}`,
            backdropFilter: "blur(8px)",
            "&:hover": {
              backgroundColor: theme.primary,
              color: "white",
            },
          },
        }}
      >
        {icon}
      </ActionIcon>
    </Indicator>
  </Tooltip>
);
