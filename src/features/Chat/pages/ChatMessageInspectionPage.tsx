import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiFileCopyLine,
  RiMessage2Line,
} from "react-icons/ri";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import type {
  LLMMessage,
} from "../../../services/CQRS/LLMChatProjection";
import type {
  ChatEvent,
} from "../../../services/CQRS/events/ChatEvent";
import type {
  UserChatMessage,
} from "../../../services/CQRS/UserChatProjection";

interface InspectionState {
  selectedMessage?: UserChatMessage;
  visibleMessages: UserChatMessage[];
  allMessages: UserChatMessage[];
  llmMessages: LLMMessage[];
  llmMessage: LLMMessage | null;
  events: ChatEvent[];
}

export const ChatMessageInspectionPage: React.FC = () => {
  const { chatId, messageId } = useParams<{
    chatId: string;
    messageId: string;
  }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<InspectionState>({
    visibleMessages: [],
    allMessages: [],
    llmMessages: [],
    llmMessage: null,
    events: [],
  });

  useEffect(() => {
    if (!chatId || !messageId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      await d.ChatEventService(chatId).Initialize();
      if (cancelled) return;
      refreshInspectionState(chatId, messageId, setState);
      setIsLoading(false);
    };

    void load();

    const userUnsubscribe = d.UserChatProjection(chatId).subscribe(() => {
      refreshInspectionState(chatId, messageId, setState);
    });
    const llmUnsubscribe = d.LLMChatProjection(chatId).subscribe(() => {
      refreshInspectionState(chatId, messageId, setState);
    });

    return () => {
      cancelled = true;
      userUnsubscribe();
      llmUnsubscribe();
    };
  }, [chatId, messageId]);

  const contextIndex = useMemo(
    () => state.llmMessages.findIndex((message) => message.id === messageId),
    [messageId, state.llmMessages],
  );

  if (!chatId || !messageId) {
    navigate("/chat");
    return null;
  }

  const selectedMessage = state.selectedMessage;

  return (
    <Page>
      <Paper mt={20} p="xl" style={styles.pageShell}>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => navigate(`/chat/${chatId}`)}
                aria-label="Back to chat"
              >
                <RiArrowLeftLine size={20} />
              </ActionIcon>
              <Group gap="xs">
                <RiMessage2Line size={22} color={Theme.page.text} />
                <Title order={3} style={{ color: Theme.page.text }}>
                  Message Inspector
                </Title>
              </Group>
            </Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<RiFileCopyLine size={14} />}
              onClick={() => copyInspectionState(state, messageId)}
            >
              Copy debug JSON
            </Button>
          </Group>

          {isLoading ? (
            <Group justify="center" p="xl">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Loading message…
              </Text>
            </Group>
          ) : !selectedMessage ? (
            <EmptyState chatId={chatId} messageId={messageId} />
          ) : (
            <>
              <SummaryGrid
                message={selectedMessage}
                visibleMessages={state.visibleMessages}
                allMessages={state.allMessages}
                contextIndex={contextIndex}
                eventCount={state.events.length}
              />

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <ContentPanel title="UI Message">
                  <MessageContent message={selectedMessage} />
                </ContentPanel>

                <ContentPanel title="LLM Projection">
                  {state.llmMessage ? (
                    <LlmMessageBlock message={state.llmMessage} />
                  ) : (
                    <Text size="sm" c="dimmed">
                      This message does not currently have an LLM projection.
                    </Text>
                  )}
                </ContentPanel>
              </SimpleGrid>

              <ContentPanel title="Current LLM Context">
                <ContextList messages={state.llmMessages} selectedId={messageId} />
              </ContentPanel>

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <ContentPanel title="Message Data">
                  <JsonBlock value={selectedMessage} />
                </ContentPanel>

                <ContentPanel title="Related Events">
                  {state.events.length > 0 ? (
                    <Stack gap="sm">
                      {state.events.map((event, index) => (
                        <EventBlock
                          key={`${event.type}-${index}`}
                          event={event}
                          index={index}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No direct event matches were found for this message id.
                    </Text>
                  )}
                </ContentPanel>
              </SimpleGrid>
            </>
          )}
        </Stack>
      </Paper>
    </Page>
  );
};

const refreshInspectionState = (
  chatId: string,
  messageId: string,
  setState: React.Dispatch<React.SetStateAction<InspectionState>>,
) => {
  const userProjection = d.UserChatProjection(chatId);
  const llmProjection = d.LLMChatProjection(chatId);
  const eventService = d.ChatEventService(chatId);
  const selectedMessage = userProjection.GetMessage(messageId);

  setState({
    selectedMessage,
    visibleMessages: userProjection.GetMessages(),
    allMessages: [...userProjection.Messages],
    llmMessages: llmProjection.GetMessages(),
    llmMessage: llmProjection.GetMessage(messageId),
    events: (eventService.Events ?? []).filter((event) =>
      eventReferencesMessage(event, messageId, selectedMessage),
    ),
  });
};

const SummaryGrid: React.FC<{
  message: UserChatMessage;
  visibleMessages: UserChatMessage[];
  allMessages: UserChatMessage[];
  contextIndex: number;
  eventCount: number;
}> = ({ message, visibleMessages, allMessages, contextIndex, eventCount }) => {
  const timelineIndex = allMessages.findIndex((item) => item.id === message.id);
  const visibleIndex = visibleMessages.findIndex((item) => item.id === message.id);
  const words = (message.content ?? "").trim().split(/\s+/).filter(Boolean).length;
  const characters = (message.content ?? "").length;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
      <Metric label="Type" value={message.type} />
      <Metric
        label="Timeline"
        value={timelineIndex === -1 ? "n/a" : `${timelineIndex + 1}/${allMessages.length}`}
        detail={visibleIndex === -1 ? "not visible" : `visible #${visibleIndex + 1}`}
      />
      <Metric
        label="LLM Context"
        value={contextIndex === -1 ? "Excluded" : `#${contextIndex + 1}`}
        valueColor={contextIndex === -1 ? Theme.credits.warning : Theme.credits.primary}
      />
      <Metric label="Events" value={String(eventCount)} />
      <Metric label="Words" value={String(words)} />
      <Metric label="Characters" value={String(characters)} />
      <Metric
        label="Hidden"
        value={message.hidden || message.hiddenByChapterId || message.hiddenByBookId ? "Yes" : "No"}
        detail={getHiddenReason(message)}
      />
      <Metric
        label="Deleted"
        value={message.deleted ? "Yes" : "No"}
        valueColor={message.deleted ? Theme.credits.error : Theme.credits.primary}
      />
    </SimpleGrid>
  );
};

const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  detail?: React.ReactNode;
}> = ({ label, value, valueColor = Theme.page.text, detail }) => (
  <Paper p="sm" style={styles.metricCard}>
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} style={{ color: valueColor }}>
        {value}
      </Text>
      {detail && (
        <Text size="xs" c="dimmed">
          {detail}
        </Text>
      )}
    </Stack>
  </Paper>
);

const ContentPanel: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <Paper p="md" style={styles.panel}>
    <Stack gap="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {title}
      </Text>
      {children}
    </Stack>
  </Paper>
);

const MessageContent: React.FC<{ message: UserChatMessage }> = ({ message }) => (
  <Stack gap="sm">
    <Group gap="xs">
      <Badge variant="light">{message.type}</Badge>
      <Text size="xs" c="dimmed">
        {message.id}
      </Text>
    </Group>
    {message.content ? (
      <Box style={styles.markdownBlock}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </Box>
    ) : (
      <Text size="sm" c="dimmed">
        This message has no text content.
      </Text>
    )}
  </Stack>
);

const LlmMessageBlock: React.FC<{ message: LLMMessage }> = ({ message }) => (
  <Stack gap="sm">
    <Group gap="xs">
      <Badge color={getRoleColor(message.role)} variant="light">
        {message.role}
      </Badge>
      <Text size="xs" c="dimmed">
        {message.id ?? "temporary message"}
      </Text>
    </Group>
    <PreBlock>{message.content}</PreBlock>
  </Stack>
);

const ContextList: React.FC<{
  messages: LLMMessage[];
  selectedId: string;
}> = ({ messages, selectedId }) => {
  if (messages.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        The current LLM context is empty.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {messages.map((message, index) => {
        const isSelected = message.id === selectedId;
        return (
          <Paper
            key={`${message.id ?? "context"}-${index}`}
            p="sm"
            style={{
              ...styles.contextRow,
              borderColor: isSelected
                ? "rgba(255, 215, 0, 0.65)"
                : styles.contextRow.border,
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" gap="sm">
                <Group gap="xs">
                  <Badge color={getRoleColor(message.role)} variant="light">
                    {message.role}
                  </Badge>
                  {isSelected && (
                    <Badge color="yellow" variant="light">
                      selected
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  #{index + 1}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {message.id ?? "No id"}
              </Text>
              <PreBlock compact>{message.content}</PreBlock>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

const EventBlock: React.FC<{ event: ChatEvent; index: number }> = ({
  event,
  index,
}) => (
  <Paper p="sm" style={styles.contextRow}>
    <Stack gap="xs">
      <Group justify="space-between">
        <Badge variant="light">{event.type}</Badge>
        <Text size="xs" c="dimmed">
          #{index + 1}
        </Text>
      </Group>
      <JsonBlock value={event} compact />
    </Stack>
  </Paper>
);

const JsonBlock: React.FC<{ value: unknown; compact?: boolean }> = ({
  value,
  compact = false,
}) => <PreBlock compact={compact}>{JSON.stringify(value, null, 2)}</PreBlock>;

const PreBlock: React.FC<{ children: string; compact?: boolean }> = ({
  children,
  compact = false,
}) => (
  <Box
    component="pre"
    style={{
      ...styles.preBlock,
      maxHeight: compact ? 220 : 520,
    }}
  >
    {children}
  </Box>
);

const EmptyState: React.FC<{ chatId: string; messageId: string }> = ({
  chatId,
  messageId,
}) => {
  const navigate = useNavigate();
  return (
    <Paper p="xl" style={styles.panel}>
      <Stack align="center" gap="sm">
        <Text fw={700}>Message not found</Text>
        <Text size="sm" c="dimmed" ta="center">
          No message with id {messageId} exists in this chat projection.
        </Text>
        <Button variant="light" onClick={() => navigate(`/chat/${chatId}`)}>
          Back to chat
        </Button>
      </Stack>
    </Paper>
  );
};

const eventReferencesMessage = (
  event: ChatEvent,
  messageId: string,
  selectedMessage?: UserChatMessage,
): boolean => {
  if ("messageId" in event && event.messageId === messageId) return true;
  if ("storyId" in event && event.storyId === messageId) return true;
  if ("chapterId" in event && event.chapterId === messageId) return true;
  if ("bookId" in event && event.bookId === messageId) return true;
  if ("noteId" in event && event.noteId === messageId) return true;
  if ("clarificationId" in event && event.clarificationId === messageId)
    return true;
  if ("jobId" in event && event.jobId === messageId) return true;
  if ("messageIds" in event && event.messageIds.includes(messageId)) return true;
  if (
    "coveredMessageIds" in event &&
    event.coveredMessageIds.includes(messageId)
  )
    return true;
  if (
    "coveredChapterIds" in event &&
    event.coveredChapterIds.includes(messageId)
  )
    return true;
  if (
    event.type === "PlanHidden" &&
    selectedMessage?.type === "plan" &&
    selectedMessage.data?.planDefinitionId === event.planDefinitionId
  )
    return true;
  return false;
};

const getHiddenReason = (message: UserChatMessage): string | undefined => {
  if (message.hiddenByBookId) return `covered by book ${message.hiddenByBookId}`;
  if (message.hiddenByChapterId)
    return `covered by chapter ${message.hiddenByChapterId}`;
  if (message.hidden) return "explicitly hidden";
  return undefined;
};

const getRoleColor = (role: LLMMessage["role"]): string => {
  if (role === "user") return "blue";
  if (role === "assistant") return "green";
  return "gray";
};

const copyInspectionState = (
  state: InspectionState,
  messageId: string,
): void => {
  const payload = {
    messageId,
    selectedMessage: state.selectedMessage,
    llmMessage: state.llmMessage,
    llmContextIndex: state.llmMessages.findIndex(
      (message) => message.id === messageId,
    ),
    relatedEvents: state.events,
  };

  void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
};

const styles = {
  pageShell: {
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  panel: {
    backgroundColor: "rgba(32, 32, 32, 0.74)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  metricCard: {
    backgroundColor: "rgba(38, 38, 38, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.07)",
  },
  contextRow: {
    backgroundColor: "rgba(12, 12, 12, 0.28)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  markdownBlock: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    color: Theme.page.text,
    overflowWrap: "anywhere",
  },
  preBlock: {
    margin: 0,
    padding: 12,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    overflowY: "auto",
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    color: "var(--mantine-color-gray-1)",
    fontSize: "0.8125rem",
    lineHeight: 1.55,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
} as const;
