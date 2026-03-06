import React from "react";
import { Select, Stack, Text } from "@mantine/core";

const MODEL_OPTIONS = [
  { value: "", label: "Default" },
  { value: "grok-4-0709", label: "grok-4-0709" },
  { value: "grok-4-1-fast-reasoning", label: "grok-4-1-fast-reasoning" },
  { value: "grok-4-fast-non-reasoning", label: "grok-4-fast-non-reasoning" },
  {
    value: "grok-4-fast-reasoning",
    label: "grok-4-fast-reasoning (Recommended!)",
  },
  { value: "grok-3", label: "grok-3" },
];

interface ModelSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  withDescription?: boolean;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  value,
  onChange,
  label = "Model",
  withDescription = true,
}) => (
  <Stack gap="xs">
    <Select
      label={label}
      value={value}
      onChange={onChange}
      data={MODEL_OPTIONS}
      clearable
    />
    {withDescription && (
      <Text size="sm" c="dimmed">
        Select which Grok model to use for chat generation. Different models
        offer varying levels of speed and reasoning capabilities. Leave empty to
        use the default model.
      </Text>
    )}
  </Stack>
);
