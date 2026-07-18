import type { ErrorDiagnostic } from "../services/ErrorDiagnostics";
import type { TrackedRequest } from "../features/OpenRouter/services/RequestTracker";

const REQUEST_MATCH_WINDOW_MS = 30_000;

export const findRelatedRequests = (
  requests: TrackedRequest[],
  diagnostic: ErrorDiagnostic,
): TrackedRequest[] =>
  requests
    .filter(
      (request) =>
        Math.abs(request.timestamp.getTime() - diagnostic.timestamp.getTime()) <=
        REQUEST_MATCH_WINDOW_MS,
    )
    .sort((left, right) => {
      const leftScore = requestMatchScore(left, diagnostic);
      const rightScore = requestMatchScore(right, diagnostic);
      return rightScore - leftScore;
    })
    .slice(0, 3);

const requestMatchScore = (
  request: TrackedRequest,
  diagnostic: ErrorDiagnostic,
): number => {
  const timeDifference = Math.abs(
    request.timestamp.getTime() - diagnostic.timestamp.getTime(),
  );
  const errorMatches =
    request.errorMessage &&
    (diagnostic.errorMessage?.includes(request.errorMessage) ||
      request.errorMessage.includes(diagnostic.errorMessage ?? diagnostic.message));
  return (request.status === "error" ? 100_000 : 0) +
    (errorMatches ? 100_000 : 0) -
    timeDifference;
};
