import { Query, useQuery } from "@tanstack/react-query";
import { CivitJobOrchestrator } from "../services/CivitJobOrchestrator";
import type { CivitJobResult } from "../types/CivitJob";

const POLL_INTERVAL_MS = 2000;

export const useCivitJob = (chatId: string, jobId: string) => {
  const queryResult = useQuery<CivitJobResult>({
    queryKey: ["civit-job", chatId, jobId],
    // Enable
    enabled: !!chatId && !!jobId,

    queryFn: async () =>
      await new CivitJobOrchestrator().getOrPollPhoto(chatId, jobId),

    refetchInterval: (query) => shouldPoll(query),

    // Once we have a photo cached, it never goes stale - serve from cache immediately
    staleTime: Infinity,

    // Don't retry on errors, let the orchestrator handle error states.
    // Once we have a photo, we're home free.
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  return {
    ...queryResult,
    photoBase64: queryResult.data?.photoBase64,
    jobStatus: queryResult.data,
  };
};

const shouldPoll = (
  query: Query<CivitJobResult, Error, CivitJobResult, readonly unknown[]>
): number | false => {
  const data = query.state.data;

  // Stop polling if we have a photo, there's an error, or job is not scheduled
  if (data?.photoBase64 || data?.error || !data?.isScheduled) {
    return false;
  }

  // Only continue polling if job is explicitly scheduled
  return data?.isScheduled ? POLL_INTERVAL_MS : false;
};
