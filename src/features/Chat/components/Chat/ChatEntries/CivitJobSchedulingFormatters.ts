export const formatQueuePosition = (position: number): string => {
  if (position === 0) return "Next in line";

  const remainder100 = position % 100;
  const suffix =
    remainder100 >= 11 && remainder100 <= 13
      ? "th"
      : position % 10 === 1
        ? "st"
        : position % 10 === 2
          ? "nd"
          : position % 10 === 3
            ? "rd"
            : "th";

  return `${position}${suffix} in line`;
};

export const formatExpectedCompletion = (
  expectedCompleteAt?: string,
  now = Date.now(),
): string | undefined => {
  if (!expectedCompleteAt) return undefined;

  const expectedCompleteAtMs = Date.parse(expectedCompleteAt);
  if (!Number.isFinite(expectedCompleteAtMs)) return undefined;

  const remainingSeconds = Math.ceil((expectedCompleteAtMs - now) / 1000);
  if (remainingSeconds <= 0) return "Expected any moment";

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const parts = [
    ...(hours ? [`${hours}h`] : []),
    ...(minutes ? [`${minutes}min`] : []),
    ...(seconds || (!hours && !minutes) ? [`${seconds}s`] : []),
  ];

  return `Expected in ${parts.join(", ")}`;
};
