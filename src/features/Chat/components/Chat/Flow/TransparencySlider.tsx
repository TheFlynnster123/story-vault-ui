import React, { useState, useCallback } from "react";
import { Box, Slider, Text, Group } from "@mantine/core";
import { RiContrastLine } from "react-icons/ri";
import { FlowStyles } from "./FlowStyles";
import { d } from "../../../../../services/Dependencies";
import { useChatSettings } from "../../../hooks/useChatSettings";

const setChatContainerTransparency = (value: number) => {
  const container = document.querySelector(".chat-container");
  if (container instanceof HTMLElement) {
    container.style.setProperty("--message-transparency", String(value));
  }
};

const toPercent = (value: number) => Math.round(value * 100);

interface TransparencySliderProps {
  chatId: string;
}

export const TransparencySlider: React.FC<TransparencySliderProps> = ({
  chatId,
}) => {
  const { messageTransparency } = useChatSettings(chatId);
  const [value, setValue] = useState<number | null>(null);

  const displayValue = value ?? messageTransparency;

  const handleChange = useCallback(
    (newValue: number) => {
      setValue(newValue);
      setChatContainerTransparency(newValue);
      d.ChatSettingsService(chatId).setMessageTransparency(newValue);
    },
    [chatId],
  );

  return (
    <Box
      p="xs"
      style={{
        backgroundColor: FlowStyles.buttonBackground,
        borderRadius: "4px",
      }}
    >
      <Group gap="xs" mb={4}>
        <RiContrastLine size={18} color={FlowStyles.text} />
        <Text size="sm" fw={500} c={FlowStyles.text}>
          Message Transparency
        </Text>
        <Text size="xs" c="dimmed" ml="auto">
          {toPercent(displayValue)}%
        </Text>
      </Group>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={displayValue}
        onChange={handleChange}
        label={(v) => `${toPercent(v)}%`}
        color="gray"
        size="sm"
        styles={{
          track: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
          thumb: { borderColor: "rgba(255, 255, 255, 0.5)" },
        }}
      />
    </Box>
  );
};
