import {
  Accordion,
  Badge,
  Box,
  Code,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useSyncExternalStore } from "react";
import type {
  ConsoleEntry,
  ErrorDiagnostic,
} from "../services/ErrorDiagnostics";
import { getErrorDiagnosticsInstance } from "../services/ErrorDiagnostics";
import { getRequestTrackerInstance } from "../features/OpenRouter/services/RequestTracker";
import { findRelatedRequests } from "./findRelatedRequests";
import { RequestInspection } from "../features/OpenRouter/components/RequestInspection";

const RELATED_CONSOLE_WINDOW_MS = 15_000;

export const ErrorDiagnosticsModal = () => {
  const diagnostics = getErrorDiagnosticsInstance();
  const diagnostic = useSyncExternalStore(
    diagnostics.subscribe.bind(diagnostics),
    diagnostics.getActive.bind(diagnostics),
  );

  return (
    <Modal
      opened={Boolean(diagnostic)}
      onClose={() => diagnostics.close()}
      title="Error details"
      size="lg"
      fullScreen={window.innerWidth < 600}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {diagnostic && <DiagnosticDetails diagnostic={diagnostic} />}
    </Modal>
  );
};

const DiagnosticDetails = ({
  diagnostic,
}: {
  diagnostic: ErrorDiagnostic;
}) => {
  const diagnostics = getErrorDiagnosticsInstance();
  const requestTracker = getRequestTrackerInstance();
  const requests = useSyncExternalStore(
    requestTracker.subscribe.bind(requestTracker),
    requestTracker.getRequests.bind(requestTracker),
  );
  const allConsoleEntries = useSyncExternalStore(
    diagnostics.subscribe.bind(diagnostics),
    diagnostics.getConsoleEntries.bind(diagnostics),
  );
  const consoleEntries = useMemo(
    () =>
      allConsoleEntries.filter(
        (entry) =>
          Math.abs(
            entry.timestamp.getTime() - diagnostic.timestamp.getTime(),
          ) <= RELATED_CONSOLE_WINDOW_MS,
      ),
    [allConsoleEntries, diagnostic.timestamp],
  );
  const relatedRequests = useMemo(
    () => findRelatedRequests(requests, diagnostic),
    [requests, diagnostic],
  );

  return (
    <Stack gap="md">
      <Box>
        <Text c="red" fw={700}>
          {diagnostic.message}
        </Text>
        {diagnostic.errorMessage &&
          diagnostic.errorMessage !== diagnostic.message && (
            <Text size="sm" mt={4}>
              {diagnostic.errorMessage}
            </Text>
          )}
        <Text size="xs" c="dimmed" mt={4}>
          {diagnostic.timestamp.toLocaleString()}
        </Text>
      </Box>

      <Accordion
        multiple
        defaultValue={[
          ...(relatedRequests.length > 0 ? ["request-0"] : []),
          "console",
        ]}
      >
        {relatedRequests.map((request, index) => (
          <Accordion.Item key={request.id} value={`request-${index}`}>
            <Accordion.Control>
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  {index === 0 ? "Likely related request" : "Possible request"}
                </Text>
                <Badge color={request.status === "error" ? "red" : "gray"}>
                  {request.httpStatus ? `HTTP ${request.httpStatus}` : request.status}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <RequestInspection request={request} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}

        <Accordion.Item value="console">
          <Accordion.Control>
            Console messages ({consoleEntries.length})
          </Accordion.Control>
          <Accordion.Panel>
            <ConsoleEntries entries={consoleEntries} />
          </Accordion.Panel>
        </Accordion.Item>

        {diagnostic.stack && (
          <Accordion.Item value="stack">
            <Accordion.Control>Stack trace</Accordion.Control>
            <Accordion.Panel>
              <DebugText value={diagnostic.stack} />
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </Stack>
  );
};

const ConsoleEntries = ({ entries }: { entries: ConsoleEntry[] }) => {
  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No console messages were captured near this error.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {entries.map((entry) => (
        <Group key={entry.id} gap="xs" wrap="nowrap" align="flex-start">
          <Code color={entry.level === "error" ? "red" : "gray"}>
            {entry.timestamp.toLocaleTimeString()}
          </Code>
          <Text size="xs" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {entry.message}
          </Text>
        </Group>
      ))}
    </Stack>
  );
};

const DebugText = ({ value }: { value: string }) => (
  <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
    {value}
  </Code>
);
