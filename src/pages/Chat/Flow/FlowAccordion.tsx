import React from "react";
import { Accordion, Text, Stack, Box, Button, Group } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  RiChatSettingsLine,
  RiFileList2Line,
  RiBookOpenLine,
} from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { ChapterModal } from "../ChatControls/ChapterModal";
import { useAddChapter } from "../ChatControls/useAddChapter";
import { chatTheme } from "../../../theme/chatTheme";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const {
    showModal,
    title,
    summary,
    nextChapterDirection,
    isGenerating,
    setTitle,
    setSummary,
    setNextChapterDirection,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
  } = useAddChapter({ chatId });

  const flowSections = [
    {
      key: "settings",
      title: "Chat Settings",
      icon: <RiChatSettingsLine size={18} />,
      onClick: () => navigate(`/chat/${chatId}/edit`),
    },
    {
      key: "notes",
      title: "Story Notes",
      icon: <RiFileList2Line size={18} />,
      onClick: () => navigate(`/chat/${chatId}/notes`),
    },
    {
      key: "memories",
      title: "Memories",
      icon: <LuBrain size={18} />,
      onClick: () => navigate(`/chat/${chatId}/memories`),
    },
  ];

  return (
    <Box
      style={{
        backgroundColor: chatTheme.flow.background,
        borderTop: `1px solid ${chatTheme.flow.border}`,
        position: "relative",
        zIndex: 10,
      }}
    >
      <Accordion
        variant="filled"
        styles={{
          root: {
            backgroundColor: "transparent",
          },
          control: {
            backgroundColor: chatTheme.flow.controlBackground,
            color: chatTheme.flow.text,
            "&:hover": {
              backgroundColor: chatTheme.flow.controlHover,
            },
          },
          label: {
            fontSize: "14px",
            fontWeight: 600,
          },
          content: {
            backgroundColor: chatTheme.flow.contentBackground,
            padding: 0,
          },
          item: {
            border: "none",
            borderBottom: `1px solid ${chatTheme.flow.border}`,
          },
          chevron: {
            color: chatTheme.flow.text,
          },
        }}
      >
        <Accordion.Item value="flow">
          <Accordion.Control>Flow</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs" p="md">
              {/* Compress to Chapter button - prominent at top */}
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                justify="flex-start"
                leftSection={<RiBookOpenLine size={18} />}
                onClick={handleOpenModal}
                styles={{
                  root: {
                    backgroundColor: chatTheme.flow.buttonBackground,
                    color: chatTheme.flow.text,
                    border: `2px solid ${chatTheme.chapter.primary}`,
                    "&:hover": {
                      backgroundColor: chatTheme.flow.buttonHover,
                    },
                  },
                }}
              >
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    Compress to Chapter
                  </Text>
                </Group>
              </Button>

              {/* Other flow sections */}
              {flowSections.map((section) => (
                <Button
                  key={section.key}
                  variant="subtle"
                  color="gray"
                  fullWidth
                  justify="flex-start"
                  leftSection={section.icon}
                  onClick={section.onClick}
                  styles={{
                    root: {
                      backgroundColor: chatTheme.flow.buttonBackground,
                      color: chatTheme.flow.text,
                      "&:hover": {
                        backgroundColor: chatTheme.flow.buttonHover,
                      },
                    },
                  }}
                >
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {section.title}
                    </Text>
                  </Group>
                </Button>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <ChapterModal
        opened={showModal}
        title={title}
        summary={summary}
        nextChapterDirection={nextChapterDirection}
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onNextChapterDirectionChange={setNextChapterDirection}
        onGenerateSummary={handleGenerateSummary}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </Box>
  );
};
