import { describe, it, expect, beforeEach } from "vitest";
import { SchedulerMapper } from "./SchedulerMapper";

describe("SchedulerMapper", () => {
  let mapper: SchedulerMapper;

  beforeEach(() => {
    mapper = new SchedulerMapper();
  });

  describe("MapToSchedulerName", () => {
    it("should be case insensitive", () => {
      const result1 = mapper.MapToSchedulerName("dpm++ 2m");
      const result2 = mapper.MapToSchedulerName("DPM++ 2M");
      const result3 = mapper.MapToSchedulerName("Dpm++ 2m");

      expect(result1).toBe("DPM2M");
      expect(result2).toBe("DPM2M");
      expect(result3).toBe("DPM2M");
    });

    it("should return the unedited scheduler if no mapping is found", () => {
      const result = mapper.MapToSchedulerName("Unknown Scheduler");
      expect(result).toBe("Unknown Scheduler");
    });

    it("should map all major display names to scheduler names correctly", () => {
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
        const result = mapper.MapToSchedulerName(input);
        expect(result).toBe(expected);
      });
    });

    it("should return the unedited scheduler if it is already in scheduler name format", () => {
      const result = mapper.MapToSchedulerName("DPM2M");
      expect(result).toBe("DPM2M");

      const result2 = mapper.MapToSchedulerName("DPMSDEKarras");
      expect(result2).toBe("DPMSDEKarras");
    });
  });

  describe("MapToDisplayName", () => {
    it("should be case insensitive", () => {
      const result1 = mapper.MapToDisplayName("dpm2m");
      const result2 = mapper.MapToDisplayName("DPM2M");
      const result3 = mapper.MapToDisplayName("Dpm2m");

      expect(result1).toBe("DPM++ 2M");
      expect(result2).toBe("DPM++ 2M");
      expect(result3).toBe("DPM++ 2M");
    });

    it("should return the unedited scheduler if no mapping is found", () => {
      const result = mapper.MapToDisplayName("UnknownSchedulerName");
      expect(result).toBe("UnknownSchedulerName");
    });

    it("should map all major scheduler names to display names correctly", () => {
      const testCases = [
        { input: "EulerA", expected: "Euler a" },
        { input: "Euler", expected: "Euler" },
        { input: "LMS", expected: "LMS" },
        { input: "Heun", expected: "Heun" },
        { input: "DPM2", expected: "DPM2" },
        { input: "DPM2A", expected: "DPM2 a" },
        { input: "DPM2SA", expected: "DPM++ 2S a" },
        { input: "DPM2M", expected: "DPM++ 2M" },
        { input: "DPMSDE", expected: "DPM++ SDE" },
        { input: "DPMFast", expected: "DPM fast" },
        { input: "DPMAdaptive", expected: "DPM adaptive" },
        { input: "LMSKarras", expected: "LMS Karras" },
        { input: "DPM2Karras", expected: "DPM2 Karras" },
        { input: "DPM2AKarras", expected: "DPM2 a Karras" },
        { input: "DPM2SAKarras", expected: "DPM++ 2S a karras" },
        { input: "DPM2MKarras", expected: "DPM++ 2M karras" },
        { input: "DPMSDEKarras", expected: "DPM++ SDE Karras" },
        { input: "DDIM", expected: "DDIM" },
        { input: "PLMS", expected: "PLMS" },
        { input: "UniPC", expected: "UniPC" },
        { input: "LCM", expected: "LCM" },
        { input: "DDPM", expected: "DDPM" },
        { input: "DEIS", expected: "DEIS" },
        { input: "DPM2MSDE", expected: "DPM++ 2M SDE" },
        { input: "DPM2MSDEKarras", expected: "DPM++ 2M SDE Karras" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = mapper.MapToDisplayName(input);
        expect(result).toBe(expected);
      });
    });

    it("should return the unedited scheduler if it is already in display name format", () => {
      const result = mapper.MapToDisplayName("DPM++ 2M");
      expect(result).toBe("DPM++ 2M");

      const result2 = mapper.MapToDisplayName("Euler a");
      expect(result2).toBe("Euler a");
    });
  });

  describe("GetAvailableSchedulers", () => {
    it("should return all schedulers with display names as both label and value", () => {
      const schedulers = mapper.GetAvailableSchedulers();

      expect(schedulers).toContainEqual({
        label: "DPM++ 2M",
        value: "DPM++ 2M",
      });
      expect(schedulers).toContainEqual({ label: "Euler a", value: "Euler a" });
      expect(schedulers).toContainEqual({ label: "DDIM", value: "DDIM" });

      // Verify all schedulers have label === value (display names are used as values)
      schedulers.forEach((scheduler) => {
        expect(scheduler.label).toBe(scheduler.value);
      });
    });
  });
});
