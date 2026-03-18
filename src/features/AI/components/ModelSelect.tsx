import React from "react";
import { Select, Stack, Text } from "@mantine/core";

const MODEL_OPTIONS = [
  { value: "", label: "Default" },
  {
    group: "⭐ Reddit Recommended",
    items: [
      { value: "deepseek/deepseek-v3.2-speciale", label: "DeepSeek V3.2 Speciale" },
      { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
      { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
      { value: "meituan/longcat-flash-chat", label: "LongCat Flash Chat" },
      { value: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
      { value: "z-ai/glm-5-turbo", label: "GLM 5 Turbo" },
      { value: "z-ai/glm-5", label: "GLM 5" },
      { value: "qwen/qwen3.5-122b-a10b", label: "Qwen3.5 122B" },
      { value: "writer/palmyra-x5", label: "Palmyra X5" },
    ],
  },
  {
    group: "xAI",
    items: [
      { value: "x-ai/grok-4.20-beta", label: "Grok 4.20 Beta" },
      { value: "x-ai/grok-4", label: "Grok 4" },
      { value: "x-ai/grok-4-fast", label: "Grok 4 Fast" },
      { value: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast" },
      { value: "x-ai/grok-3-mini", label: "Grok 3 Mini" },
    ],
  },
  {
    group: "Anthropic",
    items: [
      { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
      { value: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5" },
      { value: "anthropic/claude-opus-4.1", label: "Claude Opus 4.1" },
      { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
      { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    group: "OpenAI",
    items: [
      { value: "openai/gpt-5-pro", label: "GPT-5 Pro" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-chat", label: "GPT-5 Chat" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
    ],
  },
  {
    group: "Google",
    items: [
      { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite Preview" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    ],
  },
  {
    group: "DeepSeek",
    items: [
      { value: "deepseek/deepseek-chat-v3.1", label: "DeepSeek Chat V3.1" },
      { value: "deepseek/deepseek-v3.2-exp", label: "DeepSeek V3.2 Exp" },
      { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    ],
  },
  {
    group: "Mistral",
    items: [
      { value: "mistralai/mistral-medium-3.1", label: "Mistral Medium 3.1" },
      { value: "mistralai/mistral-large-2512", label: "Mistral Large" },
      { value: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2" },
    ],
  },
  {
    group: "Qwen",
    items: [
      { value: "qwen/qwen3.5-397b-a17b", label: "Qwen3.5 397B" },
      { value: "qwen/qwen3-235b-a22b", label: "Qwen3 235B" },
      { value: "qwen/qwen3-max", label: "Qwen3 Max" },
      { value: "qwen/qwen3-coder", label: "Qwen3 Coder" },
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
