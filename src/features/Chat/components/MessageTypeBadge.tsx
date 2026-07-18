import { Badge } from "@mantine/core";
import { getMessageTypePresentation } from "./messageTypePresentation";

export const MessageTypeBadge = ({
  type,
  role,
}: {
  type?: string;
  role?: "user" | "assistant" | "system";
}) => {
  const presentation = getMessageTypePresentation(type, role);

  return (
    <Badge
      variant="filled"
      style={{
        backgroundColor: presentation.color,
        color: "white",
      }}
    >
      {presentation.label}
    </Badge>
  );
};
