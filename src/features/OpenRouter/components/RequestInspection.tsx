import {
  Accordion,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { RiFileCopyLine } from "react-icons/ri";
import { useState } from "react";
import type {
  TrackedMessage,
  TrackedRequest,
} from "../services/RequestTracker";
import {
  DEFAULT_VISIBLE_MESSAGE_COUNT,
  getRecentMessages,
} from "./recentMessageContext";

const EXPANDED_MESSAGE_COUNT = 10;

export const RequestInspection = ({
  request,
}: {
  request: TrackedRequest;
}) => (
  <Stack gap="md">
    <Group justify="space-between" align="flex-start">
      <Stack gap={3}>
        <Group gap="xs">
          <Badge color={request.status === "error" ? "red" : "green"}>
            {request.httpStatus ? `HTTP ${request.httpStatus}` : request.status}
          </Badge>
          <Badge variant="light">{request.label}</Badge>
        </Group>
        <Text size="sm" fw={600}>
          {request.model ?? "Provider default model"}
        </Text>
        <Text size="xs" c="dimmed">
          {request.timestamp.toLocaleString()} · {request.inputMessageCount} messages
        </Text>
      </Stack>
      <Button
        size="compact-xs"
        variant="subtle"
        leftSection={<RiFileCopyLine size={13} />}
        onClick={() => copyDebugBundle(request)}
      >
        Copy debug
      </Button>
    </Group>

    {request.errorMessage && (
      <Text size="sm" c="red">
        {request.errorMessage}
      </Text>
    )}

    <Accordion multiple defaultValue={["context"]}>
      <Accordion.Item value="parameters">
        <Accordion.Control>Model / request parameters</Accordion.Control>
        <Accordion.Panel>
          <DebugText
            value={JSON.stringify(
              { model: request.model, ...request.requestSettings },
              null,
              2,
            )}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="context">
        <Accordion.Control>
          Recent message context ({Math.min(DEFAULT_VISIBLE_MESSAGE_COUNT, request.inputMessages.length)}/
          {request.inputMessages.length})
        </Accordion.Control>
        <Accordion.Panel>
          <RecentMessageContext messages={request.inputMessages} />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="response">
        <Accordion.Control>
          Response{request.httpStatus ? ` · HTTP ${request.httpStatus}` : ""}
        </Accordion.Control>
        <Accordion.Panel>
          <DebugText value={request.responseContent || "(No response body)"} />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  </Stack>
);

const RecentMessageContext = ({
  messages,
}: {
  messages: TrackedMessage[];
}) => {
  const [visibleCount, setVisibleCount] = useState(
    DEFAULT_VISIBLE_MESSAGE_COUNT,
  );
  const visibleMessages = getRecentMessages(messages, visibleCount);
  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <Stack gap="xs">
      {hiddenCount > 0 && (
        <Text size="xs" c="dimmed">
          {hiddenCount} earlier messages hidden
        </Text>
      )}
      {visibleMessages.map((message, index) => (
        <Box
          key={`${messages.length - visibleMessages.length + index}-${message.role}`}
          p="xs"
          style={{
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
          }}
        >
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            {message.role}
          </Text>
          <Text
            size="xs"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {message.content}
          </Text>
        </Box>
      ))}
      {messages.length > DEFAULT_VISIBLE_MESSAGE_COUNT && (
        <Group gap="xs" mt={4}>
          {visibleCount < Math.min(EXPANDED_MESSAGE_COUNT, messages.length) && (
            <Button
              size="compact-xs"
              variant="light"
              onClick={() => setVisibleCount(EXPANDED_MESSAGE_COUNT)}
            >
              Show a few more
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
          {visibleCount > DEFAULT_VISIBLE_MESSAGE_COUNT && (
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => setVisibleCount(DEFAULT_VISIBLE_MESSAGE_COUNT)}
            >
              Show less
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
};

const DebugText = ({ value }: { value: string }) => (
  <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
    {value}
  </Code>
);

const copyDebugBundle = (request: TrackedRequest): void => {
  navigator.clipboard?.writeText(
    JSON.stringify(
      {
        ...request,
        timestamp: request.timestamp.toISOString(),
      },
      null,
      2,
    ),
  );
};
