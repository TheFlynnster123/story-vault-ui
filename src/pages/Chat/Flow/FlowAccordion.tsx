import React, { useState } from "react";
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
import { usePlanCache } from "../../../hooks/usePlanCache";
import { useMemories } from "../../../hooks/useMemories";
import { chatTheme } from "../../../theme/chatTheme";
import { PreviewItem } from "./PreviewItem";
import { ContentPreview } from "./ContentPreview";
import type { Plan } from "../../../models/Plan";
import type { Memory } from "../../../models/Memory";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const [planExpanded, setPlanExpanded] = useState(false);
  const [memoriesExpanded, setMemoriesExpanded] = useState(false);

  const { plans } = usePlanCache(chatId);
  const { memories } = useMemories(chatId);

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

  const renderPlanItem = (plan: Plan) => (
    <PreviewItem
      key={plan.id}
      name={plan.name}
      description={plan.prompt}
      content={plan.content}
      isExpanded={planExpanded}
    />
  );

  const renderMemoryItem = (memory: Memory) => (
    <PreviewItem
      key={memory.id}
      content={memory.content}
      isExpanded={memoriesExpanded}
    />
  );

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

              {/* Chat Settings */}
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                justify="flex-start"
                leftSection={<RiChatSettingsLine size={18} />}
                onClick={() => navigate(`/chat/${chatId}/edit`)}
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
                    Chat Settings
                  </Text>
                </Group>
              </Button>

              {/* Plan with preview */}
              <Box>
                <Button
                  variant="subtle"
                  color="gray"
                  fullWidth
                  justify="flex-start"
                  leftSection={<RiFileList2Line size={18} />}
                  onClick={() => navigate(`/chat/${chatId}/plan`)}
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
                      Plan
                    </Text>
                    <Text size="xs" c="dimmed">
                      ({plans.length})
                    </Text>
                  </Group>
                </Button>
                <ContentPreview
                  items={plans}
                  isExpanded={planExpanded}
                  onToggle={() => setPlanExpanded(!planExpanded)}
                  renderItem={renderPlanItem}
                  emptyMessage="No plans configured"
                />
              </Box>

              {/* Memories with preview */}
              <Box>
                <Button
                  variant="subtle"
                  color="gray"
                  fullWidth
                  justify="flex-start"
                  leftSection={<LuBrain size={18} />}
                  onClick={() => navigate(`/chat/${chatId}/memories`)}
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
                      Memories
                    </Text>
                    <Text size="xs" c="dimmed">
                      ({memories.length})
                    </Text>
                  </Group>
                </Button>
                <ContentPreview
                  items={memories}
                  isExpanded={memoriesExpanded}
                  onToggle={() => setMemoriesExpanded(!memoriesExpanded)}
                  renderItem={renderMemoryItem}
                  emptyMessage="No memories saved"
                />
              </Box>
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
