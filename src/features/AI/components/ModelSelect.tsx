import React from "react";
import { Select, Stack, Text } from "@mantine/core";

const MODEL_OPTIONS = [
  { value: "", label: "Default" },
  {
    group: "⭐ Reddit Recommended",
    items: [
      { value: "deepseek/deepseek-v3.2-exp", label: "DeepSeek V3.2 Exp" },
      { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
      { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3 0324" },
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "meituan/longcat-flash-chat", label: "LongCat Flash Chat" },
      { value: "moonshotai/kimi-k2", label: "Kimi K2" },
      { value: "z-ai/glm-5-turbo", label: "GLM 5 Turbo" },
      { value: "z-ai/glm-5", label: "GLM 5" },
      { value: "qwen/qwen3-235b-a22b", label: "Qwen3 235B" },
    ],
  },
  {
    group: "xAI",
    items: [
      { value: "x-ai/grok-4", label: "Grok 4.0" },
      { value: "x-ai/grok-4-0709", label: "Grok 4.0 (0709)" },
      { value: "x-ai/grok-4.1-mini", label: "Grok 4.1 Mini (Recommended!)" },
      { value: "x-ai/grok-4.1-mini-fast", label: "Grok 4.1 Mini Fast" },
      { value: "x-ai/grok-3-mini", label: "Grok 3 Mini" },
    ],
  },
  {
    group: "Anthropic",
    items: [{ value: "anthropic/claude-opus-4", label: "Claude Opus 4" }],
  },
  {
    group: "OpenAI",
    items: [
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    ],
  },
  {
    group: "Google",
    items: [
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    group: "Meta",
    items: [
      { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    ],
  },
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
        Select which model to use for chat generation via OpenRouter. Different
        models offer varying levels of speed and reasoning capabilities. Leave
        empty to use the default model.
      </Text>
    )}
  </Stack>
);
