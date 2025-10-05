import { describe, it, expect, beforeEach } from "vitest";
import { SchedulerMapper } from "./SchedulerMapper";

describe("SchedulerMapper", () => {
  let mapper: SchedulerMapper;

  beforeEach(() => {
    mapper = new SchedulerMapper();
  });

  it("should be case insensitive", () => {
    const result1 = mapper.MapScheduler("dpm++ 2m");
    const result2 = mapper.MapScheduler("DPM++ 2M");
    const result3 = mapper.MapScheduler("Dpm++ 2m");

    expect(result1).toBe("DPM2M");
    expect(result2).toBe("DPM2M");
    expect(result3).toBe("DPM2M");
  });

  it("should throw error for unsupported scheduler", () => {
    expect(() => {
      mapper.MapScheduler("Unknown Scheduler");
    }).toThrow("Unsupported scheduler: Unknown Scheduler");
  });

  it("should map all major schedulers correctly", () => {
    const testCases = [
      { input: "Euler a", expected: "EulerA" },
      { input: "Euler", expected: "Euler" },
      { input: "LMS", expected: "LMS" },
      { input: "Heun", expected: "Heun" },
      { input: "DPM2", expected: "DPM2" },
      { input: "DPM2 a", expected: "DPM2A" },
      { input: "DPM++ 2S a", expected: "DPM2SA" },
      { input: "DPM++ 2M", expected: "DPM2M" },
      { input: "DPM++ SDE", expected: "DPMSDE" },
      { input: "DPM fast", expected: "DPMFast" },
      { input: "DPM adaptive", expected: "DPMAdaptive" },
      { input: "LMS Karras", expected: "LMSKarras" },
      { input: "DPM2 Karras", expected: "DPM2Karras" },
      { input: "DPM2 a Karras", expected: "DPM2AKarras" },
      { input: "DPM++ 2S a karras", expected: "DPM2SAKarras" },
      { input: "DPM++ 2M karras", expected: "DPM2MKarras" },
      { input: "DPM++ SDE Karras", expected: "DPMSDEKarras" },
      { input: "DDIM", expected: "DDIM" },
      { input: "PLMS", expected: "PLMS" },
      { input: "UniPC", expected: "UniPC" },
      { input: "LCM", expected: "LCM" },
      { input: "DDPM", expected: "DDPM" },
      { input: "DEIS", expected: "DEIS" },
      { input: "DPM++ 2M SDE", expected: "DPM2MSDE" },
      { input: "DPM++ 2M SDE Karras", expected: "DPM2MSDEKarras" },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = mapper.MapScheduler(input);
      expect(result).toBe(expected);
    });
  });
});
