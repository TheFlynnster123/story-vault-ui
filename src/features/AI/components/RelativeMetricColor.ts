export type MetricPreference = "lower" | "higher";

const BEST_METRIC_HUE = 120;

export const getRelativeMetricDifference = (
  value: number | undefined,
  bestValue: number | undefined,
  preference: MetricPreference,
): number | undefined => {
  if (
    value === undefined ||
    bestValue === undefined ||
    !Number.isFinite(value) ||
    !Number.isFinite(bestValue)
  ) {
    return undefined;
  }

  const difference =
    preference === "lower" ? value - bestValue : bestValue - value;
  if (difference <= 0) return 0;
  if (bestValue === 0) return 1;
  return difference / Math.abs(bestValue);
};

export const getRelativeMetricHue = (
  value: number | undefined,
  bestValue: number | undefined,
  preference: MetricPreference,
): number | undefined => {
  const relativeDifference = getRelativeMetricDifference(
    value,
    bestValue,
    preference,
  );
  if (relativeDifference === undefined) return undefined;
  return BEST_METRIC_HUE * (1 - Math.min(relativeDifference, 1));
};
