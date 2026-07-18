import { Modal, ScrollArea, Text } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { getRequestTrackerInstance } from "../services/RequestTracker";
import { getRequestInspectorInstance } from "../services/RequestInspector";
import { RequestInspection } from "./RequestInspection";

export const RequestInspectorModal = () => {
  const inspector = getRequestInspectorInstance();
  const tracker = getRequestTrackerInstance();
  const activeRequestId = useSyncExternalStore(
    inspector.subscribe.bind(inspector),
    inspector.getActiveRequestId.bind(inspector),
  );
  const requests = useSyncExternalStore(
    tracker.subscribe.bind(tracker),
    tracker.getRequests.bind(tracker),
  );
  const request = requests.find(({ id }) => id === activeRequestId);

  return (
    <Modal
      opened={activeRequestId !== null}
      onClose={() => inspector.close()}
      title="Request Inspector"
      size="lg"
      fullScreen={window.innerWidth < 600}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {request ? (
        <RequestInspection request={request} />
      ) : (
        <Text size="sm" c="dimmed">
          This request is no longer available in the session history.
        </Text>
      )}
    </Modal>
  );
};
