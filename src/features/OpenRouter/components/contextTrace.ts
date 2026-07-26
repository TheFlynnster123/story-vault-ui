import type { TrackedContextTrace } from "../services/RequestTracker";

export interface ContextTraceSummary {
  includedCount: number;
  excludedCount: number;
  bufferedCount: number;
}

export const summarizeContextTrace = (
  trace: TrackedContextTrace,
): ContextTraceSummary =>
  trace.projection.reduce<ContextTraceSummary>(
    (summary, entry) => ({
      includedCount: summary.includedCount + Number(entry.included),
      excludedCount: summary.excludedCount + Number(!entry.included),
      bufferedCount: summary.bufferedCount + Number(entry.buffered),
    }),
    {
      includedCount: 0,
      excludedCount: 0,
      bufferedCount: 0,
    },
  );
