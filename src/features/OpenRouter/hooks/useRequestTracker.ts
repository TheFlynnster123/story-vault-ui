import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { TrackedRequest } from "../services/RequestTracker";

export const useRequestTracker = (): TrackedRequest[] => {
  const [requests, setRequests] = useState<TrackedRequest[]>(() =>
    d.RequestTracker().getRequests(),
  );

  useEffect(() => {
    const tracker = d.RequestTracker();
    setRequests(tracker.getRequests());
    return tracker.subscribe(() => setRequests(tracker.getRequests()));
  }, []);

  return requests;
};
