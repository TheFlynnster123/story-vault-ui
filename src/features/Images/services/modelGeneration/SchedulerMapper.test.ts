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

      expect(result1).toBe("dpm++2m");
      expect(result2).toBe("dpm++2m");
      expect(result3).toBe("dpm++2m");
    });

    it("should return the unedited scheduler if no mapping is found", () => {
      const result = mapper.MapToSchedulerName("Unknown Scheduler");
      expect(result).toBe("Unknown Scheduler");
    });

    it("should map all major display names to scheduler names correctly", () => {
      const testCases = [
        { input: "Euler a", expected: "euler_a" },
        { input: "Euler", expected: "euler" },
        { input: "Heun", expected: "heun" },
        { input: "DPM2", expected: "dpm2" },
        { input: "DPM++ 2S a", expected: "dpm++2s_a" },
        { input: "DPM++ 2M", expected: "dpm++2m" },
        { input: "DPM++ 2M v2", expected: "dpm++2mv2" },
        { input: "DPM++ 2S a Karras", expected: "dpm++2s_a:karras" },
        { input: "DPM++ 2M Karras", expected: "dpm++2m:karras" },
        { input: "IPNDM", expected: "ipndm" },
        { input: "IPNDM V", expected: "ipndm_v" },
        { input: "DDIM Trailing", expected: "ddim_trailing" },
        { input: "LCM", expected: "lcm" },
        { input: "Res Multistep", expected: "res_multistep" },
        { input: "Res 2S", expected: "res_2s" },
        { input: "TCD", expected: "tcd" },
        { input: "ER SDE", expected: "er_sde" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = mapper.MapToSchedulerName(input);
        expect(result).toBe(expected);
      });
    });

    it("should return the unedited scheduler if it is already in scheduler name format", () => {
      const result = mapper.MapToSchedulerName("dpm++2m");
      expect(result).toBe("dpm++2m");

      const result2 = mapper.MapToSchedulerName("DPM2MKarras");
      expect(result2).toBe("DPM2MKarras");
    });
  });

  describe("MapToDisplayName", () => {
    it("should be case insensitive", () => {
      const result1 = mapper.MapToDisplayName("dpm++2m");
      const result2 = mapper.MapToDisplayName("DPM++2M");
      const result3 = mapper.MapToDisplayName("Dpm++2m");

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
        { input: "euler_a", expected: "Euler a" },
        { input: "euler", expected: "Euler" },
        { input: "Heun", expected: "Heun" },
        { input: "DPM2", expected: "DPM2" },
        { input: "DPM2SA", expected: "DPM++ 2S a" },
        { input: "DPM2M", expected: "DPM++ 2M" },
        { input: "DPM2MV2", expected: "DPM++ 2M v2" },
        { input: "DPM2SAKarras", expected: "DPM++ 2S a Karras" },
        { input: "DPM2MKarras", expected: "DPM++ 2M Karras" },
        { input: "IPNDM", expected: "IPNDM" },
        { input: "IPNDMV", expected: "IPNDM V" },
        { input: "DDIMTrailing", expected: "DDIM Trailing" },
        { input: "LCM", expected: "LCM" },
        { input: "ResMultistep", expected: "Res Multistep" },
        { input: "Res2S", expected: "Res 2S" },
        { input: "TCD", expected: "TCD" },
        { input: "ERSDE", expected: "ER SDE" },
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
      expect(schedulers).toContainEqual({
        label: "DDIM Trailing",
        value: "DDIM Trailing",
      });

      // Verify all schedulers have label === value (display names are used as values)
      schedulers.forEach((scheduler) => {
        expect(scheduler.label).toBe(scheduler.value);
      });
    });
  });

  describe("MapToSampleMethodParams", () => {
    it("maps supported display names to current SdCppSampleMethod enum values", () => {
      expect(mapper.MapToSampleMethodParams("DPM++ 2M")).toEqual({
        sampleMethod: "dpm++2m",
      });
      expect(mapper.MapToSampleMethodParams("DPM++ 2M Karras")).toEqual({
        sampleMethod: "dpm++2m",
        schedule: "karras",
      });
    });
  });
});
