import React from "react";
import { Accordion, Stack, Box } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { FlowStyles } from "./FlowStyles";
import { CompressSection } from "./CompressSection";
import { NoteSection } from "./NoteSection";
import { ChatSettingsButton } from "./ChatSettingsButton";
import { ChatImageModelsSection } from "./ChatImageModelsSection";
import { ChatModelSection } from "./ChatModelSection";
import { usePlanCache } from "../../../../Plans/hooks/usePlanCache";
import { PlanSection } from "../../../../Plans/components/PlanSection";
import { MemoriesSection } from "../../../../Memories/components/MemoriesSection";
import { CharacterDescriptionsSection } from "../../../../Characters/components/CharacterDescriptionsSection";
import { TransparencySlider } from "./TransparencySlider";
import { CreditsSection } from "./CreditsSection";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const { plans } = usePlanCache(chatId);

  const navigateToChatSettings = () => navigate(`/chat/${chatId}/edit`);
  const navigateToPlan = () => navigate(`/chat/${chatId}/plan`);
  const navigateToMemories = () => navigate(`/chat/${chatId}/memories`);
  const navigateToCharacters = () => navigate(`/chat/${chatId}/characters`);
  const navigateToChatImageModels = () =>
    navigate(`/chat/${chatId}/image-models`);

  return (
    <Box
      style={{
        backgroundColor: FlowStyles.background,
        borderTop: `1px solid ${FlowStyles.border}`,
        position: "relative",
        zIndex: 10,
      }}
    >
      <Accordion variant="filled" styles={getAccordionStyles()}>
        <Accordion.Item value="flow">
          <Accordion.Control>Flow</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs" p="md">
              <TransparencySlider chatId={chatId} />
              <ChatModelSection chatId={chatId} />
              <CreditsSection chatId={chatId} />
              <ChatImageModelsSection
                chatId={chatId}
                onNavigate={navigateToChatImageModels}
              />
              <ChatSettingsButton onClick={navigateToChatSettings} />
              <PlanSection
                chatId={chatId}
                plans={plans}
                onNavigate={navigateToPlan}
              />
              <CompressSection chatId={chatId} />
              <NoteSection chatId={chatId} />
              <CharacterDescriptionsSection
                chatId={chatId}
                onNavigate={navigateToCharacters}
              />
              <MemoriesSection
                chatId={chatId}
                onNavigate={navigateToMemories}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
};

const getAccordionStyles = () => ({
  root: {
    backgroundColor: "transparent",
  },
  control: {
    backgroundColor: FlowStyles.controlBackground,
    color: FlowStyles.text,
    "&:hover": {
      backgroundColor: FlowStyles.controlHover,
    },
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
  },
  content: {
    backgroundColor: FlowStyles.contentBackground,
    padding: 0,
  },
  item: {
    border: "none",
    borderBottom: `1px solid ${FlowStyles.border}`,
  },
  chevron: {
    color: FlowStyles.text,
  },
});
