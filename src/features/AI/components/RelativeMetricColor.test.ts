import { describe, expect, it } from "vitest";
import {
  getRelativeMetricDifference,
  getRelativeMetricHue,
} from "./RelativeMetricColor";

describe("RelativeMetricColor", () => {
  it("keeps the best value green", () => {
    expect(getRelativeMetricHue(10, 10, "lower")).toBe(120);
    expect(getRelativeMetricHue(99.9, 99.9, "higher")).toBe(120);
  });

  it("makes a ten-percent price premium slightly yellow-green", () => {
    expect(getRelativeMetricHue(11, 10, "lower")).toBeCloseTo(108);
    expect(getRelativeMetricDifference(11, 10, "lower")).toBeCloseTo(0.1);
  });

  it("keeps close uptime values nearly the same green", () => {
    expect(getRelativeMetricHue(99.5, 99.9, "higher")).toBeCloseTo(119.52);
    expect(
      getRelativeMetricDifference(99.5, 99.9, "higher"),
    ).toBeCloseTo(0.004);
  });

  it("grades a value twice as expensive red", () => {
    expect(getRelativeMetricHue(20, 10, "lower")).toBe(0);
  });

  it("does not grade missing metrics", () => {
    expect(getRelativeMetricHue(undefined, 10, "lower")).toBeUndefined();
  });
});
