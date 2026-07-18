import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
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
  RiArrowDownLine,
  RiArrowLeftLine,
  RiFileCopyLine,
  RiHistoryLine,
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
import {
  DEFAULT_INSPECTION_CONTEXT_COUNT,
  EXPANDED_INSPECTION_CONTEXT_COUNT,
  getMessageAgeLabel,
  getRecentContext,
} from "./messageInspectionContext";
import { MessageTypeBadge } from "../components/MessageTypeBadge";

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
  const isMobile = useMediaQuery("(max-width: 48em)");
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
    <Page padding={isMobile ? 4 : "md"}>
      <Paper mt={isMobile ? 4 : 20} p={isMobile ? "xs" : "xl"} style={styles.pageShell}>
        <Stack gap={isMobile ? "sm" : "lg"}>
          <Group justify="space-between" align="center" wrap="wrap">
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

              <SimpleGrid
                cols={{ base: 1, lg: 2 }}
                spacing={isMobile ? "xs" : "md"}
              >
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

              <ContentPanel title="Current LLM Context">
                <ContextList
                  key={messageId}
                  messages={state.llmMessages}
                  selectedId={messageId}
                  isMobile={isMobile}
                />
              </ContentPanel>
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
  const hiddenReason = getHiddenReason(message);

  return (
    <Paper p={{ base: "xs", sm: "sm" }} style={styles.summaryBar}>
      <Group gap="xs">
        <MessageTypeBadge type={message.type} />
        <Badge color="gray" variant="light">
          Timeline{" "}
          {timelineIndex === -1
            ? "n/a"
            : `${timelineIndex + 1}/${allMessages.length}`}
          {" · "}
          {visibleIndex === -1 ? "not visible" : `visible #${visibleIndex + 1}`}
        </Badge>
        <Badge
          variant="light"
          style={{
            color:
              contextIndex === -1
                ? Theme.credits.warning
                : Theme.credits.primary,
          }}
        >
          LLM context{" "}
          {contextIndex === -1 ? "excluded" : `#${contextIndex + 1}`}
        </Badge>
        <Badge color="gray" variant="light">
          {eventCount} {eventCount === 1 ? "event" : "events"}
        </Badge>
        <Badge color="gray" variant="light">
          {words} {words === 1 ? "word" : "words"}
        </Badge>
        <Badge color="gray" variant="light">
          {characters} {characters === 1 ? "character" : "characters"}
        </Badge>
        {hiddenReason && (
          <Badge
            variant="light"
            style={{ color: Theme.credits.warning }}
          >
            Hidden · {hiddenReason}
          </Badge>
        )}
        {message.deleted && (
          <Badge variant="light" style={{ color: Theme.credits.error }}>
            Deleted
          </Badge>
        )}
      </Group>
    </Paper>
  );
};

const ContentPanel: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <Paper p={{ base: "xs", sm: "md" }} style={styles.panel}>
    <Stack gap="xs">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {title}
      </Text>
      {children}
    </Stack>
  </Paper>
);

const ContextList: React.FC<{
  messages: LLMMessage[];
  selectedId: string;
  isMobile: boolean;
}> = ({ messages, selectedId, isMobile }) => {
  const [visibleCount, setVisibleCount] = useState(
    DEFAULT_INSPECTION_CONTEXT_COUNT,
  );

  if (messages.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        The current LLM context is empty.
      </Text>
    );
  }

  const visibleMessages = getRecentContext(messages, visibleCount);
  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <Stack gap={0}>
      <Paper p={isMobile ? "xs" : "sm"} style={styles.contextToolbar}>
        <Group justify="space-between" align="flex-start" gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Box style={styles.contextToolbarIcon}>
              <RiHistoryLine size={16} color="var(--mantine-color-gray-3)" />
            </Box>
            <Stack gap={1}>
              <Text size="sm" fw={700}>
                {visibleMessages.length} of {messages.length} messages
              </Text>
              <Group gap={5}>
                <Text size="xs" c="dimmed">
                  Older
                </Text>
                <RiArrowDownLine size={12} color="rgba(255,255,255,0.45)" />
                <Text size="xs" c="dimmed">
                  Newer
                </Text>
              </Group>
            </Stack>
          </Group>
          {messages.length > DEFAULT_INSPECTION_CONTEXT_COUNT && (
            <Group gap="xs" justify="flex-end">
              {visibleCount <
                Math.min(EXPANDED_INSPECTION_CONTEXT_COUNT, messages.length) && (
                <Button
                  size="compact-xs"
                  variant="light"
                  onClick={() =>
                    setVisibleCount(EXPANDED_INSPECTION_CONTEXT_COUNT)
                  }
                >
                  Show {Math.min(EXPANDED_INSPECTION_CONTEXT_COUNT, messages.length)}
                </Button>
              )}
              {visibleCount < messages.length && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => setVisibleCount(messages.length)}
                >
                  Show all
                </Button>
              )}
              {visibleCount > DEFAULT_INSPECTION_CONTEXT_COUNT && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() =>
                    setVisibleCount(DEFAULT_INSPECTION_CONTEXT_COUNT)
                  }
                >
                  Show latest 3
                </Button>
              )}
            </Group>
          )}
        </Group>
        {hiddenCount > 0 && (
          <Text size="xs" c="dimmed" mt="xs">
            {hiddenCount} older messages hidden. Expand from here without
            losing your place.
          </Text>
        )}
        <Box
          aria-hidden
          style={
            isMobile
              ? styles.contextToolbarConnectorMobile
              : styles.contextToolbarConnector
          }
        />
      </Paper>

      <Box
        style={
          isMobile ? styles.contextTimelineMobile : styles.contextTimeline
        }
      >
        <Box
          aria-hidden
          style={
            isMobile
              ? styles.contextTimelineLineMobile
              : styles.contextTimelineLine
          }
        />
        <Stack gap="sm">
          {visibleMessages.map((message, index) => {
            const isSelected = message.id === selectedId;
            const isGeneratedResponse =
              isSelected && message.role === "assistant";
            const contextIndex = hiddenCount + index;
            const isNewest = contextIndex === messages.length - 1;
            return (
              <Box
                key={`${message.id ?? "context"}-${contextIndex}`}
                style={
                  isMobile
                    ? styles.contextTimelineItemMobile
                    : styles.contextTimelineItem
                }
              >
                <Text
                  size="xs"
                  c="dimmed"
                  style={isMobile ? styles.contextAgeMobile : styles.contextAge}
                >
                  {getMessageAgeLabel(message)}
                </Text>
                <Box
                  aria-hidden
                  style={{
                    ...(isMobile
                      ? styles.contextTimelineDotMobile
                      : styles.contextTimelineDot),
                    backgroundColor: isSelected
                      ? Theme.credits.primary
                      : roleTimelineColor(message.role),
                  }}
                />
                <Paper
                  p={isMobile ? "xs" : "sm"}
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
                        <MessageTypeBadge
                          type={message.type}
                          role={message.role}
                        />
                        {isGeneratedResponse ? (
                          <Badge color="green" variant="filled">
                            generated response
                          </Badge>
                        ) : isSelected ? (
                          <Badge color="yellow" variant="light">
                            inspected
                          </Badge>
                        ) : null}
                        {isNewest && (
                          <Badge color="gray" variant="outline">
                            newest
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {contextIndex + 1} / {messages.length}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      <Text span fw={700}>
                        Message ID:
                      </Text>{" "}
                      {message.id ?? "Temporary message"}
                    </Text>
                    <Box
                      style={{
                        ...styles.contextContent,
                        padding: isMobile ? 8 : styles.contextContent.padding,
                      }}
                    >
                      {message.content}
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
};

const EventBlock: React.FC<{ event: ChatEvent; index: number }> = ({
  event,
  index,
}) => (
  <Paper p={{ base: "xs", sm: "sm" }} style={styles.contextRow}>
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

const roleTimelineColor = (role: LLMMessage["role"]): string => {
  if (role === "user") return "var(--mantine-color-blue-5)";
  if (role === "assistant") return "var(--mantine-color-green-5)";
  return "var(--mantine-color-gray-5)";
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
  summaryBar: {
    backgroundColor: "rgba(38, 38, 38, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.07)",
  },
  contextRow: {
    backgroundColor: "rgba(12, 12, 12, 0.42)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  contextToolbar: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    borderBottomLeftRadius: 0,
  },
  contextToolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    flex: "0 0 22px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },
  contextToolbarConnector: {
    position: "absolute",
    zIndex: 1,
    left: 22,
    bottom: -17,
    width: 82,
    height: 17,
    borderLeft: "2px solid rgba(255, 255, 255, 0.18)",
    borderBottom: "2px solid rgba(255, 255, 255, 0.18)",
    borderBottomLeftRadius: 8,
  },
  contextToolbarConnectorMobile: {
    position: "absolute",
    zIndex: 1,
    left: 18,
    bottom: -10,
    width: 2,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  contextTimeline: {
    position: "relative",
    paddingTop: 16,
  },
  contextTimelineMobile: {
    position: "relative",
    paddingTop: 10,
  },
  contextTimelineLine: {
    position: "absolute",
    left: 103,
    top: 0,
    bottom: 14,
    width: 2,
    borderRadius: 2,
    background: "rgba(255, 255, 255, 0.18)",
  },
  contextTimelineLineMobile: {
    position: "absolute",
    left: 18,
    top: 0,
    bottom: 14,
    width: 2,
    borderRadius: 2,
    background: "rgba(255, 255, 255, 0.18)",
  },
  contextTimelineItem: {
    position: "relative",
    paddingLeft: 122,
  },
  contextTimelineItemMobile: {
    position: "relative",
    paddingLeft: 34,
  },
  contextAge: {
    position: "absolute",
    left: 0,
    top: 14,
    width: 86,
    textAlign: "right",
    lineHeight: 1.25,
  },
  contextAgeMobile: {
    display: "block",
    marginBottom: 4,
    lineHeight: 1.25,
  },
  contextTimelineDot: {
    position: "absolute",
    zIndex: 1,
    left: 97,
    top: 17,
    width: 13,
    height: 13,
    borderRadius: "50%",
    border: "3px solid rgba(25, 25, 25, 1)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
  },
  contextTimelineDotMobile: {
    position: "absolute",
    zIndex: 1,
    left: 12,
    top: 28,
    width: 13,
    height: 13,
    borderRadius: "50%",
    border: "3px solid rgba(25, 25, 25, 1)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
  },
  contextContent: {
    maxHeight: 220,
    overflowY: "auto",
    padding: "10px 12px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    color: "var(--mantine-color-gray-2)",
    fontSize: "0.875rem",
    lineHeight: 1.55,
  },
  preBlock: {
    margin: 0,
    padding: 8,
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
