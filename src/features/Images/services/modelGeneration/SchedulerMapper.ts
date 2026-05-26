/** Maps display name → orchestration API sampleMethod + optional schedule fields (sdcpp engine) */
export type SdCppSamplerParams = {
  sampleMethod: string;
  schedule?: string;
};

export class SchedulerMapper {
  private readonly schedulerMappings = {
    "Euler a": "EulerA",
    Euler: "Euler",
    LMS: "LMS",
    Heun: "Heun",
    DPM2: "DPM2",
    "DPM2 a": "DPM2A",
    "DPM++ 2S a": "DPM2SA",
    "DPM++ 2M": "DPM2M",
    "DPM++ SDE": "DPMSDE",
    "DPM fast": "DPMFast",
    "DPM adaptive": "DPMAdaptive",
    "LMS Karras": "LMSKarras",
    "DPM2 Karras": "DPM2Karras",
    "DPM2 a Karras": "DPM2AKarras",
    "DPM++ 2S a karras": "DPM2SAKarras",
    "DPM++ 2M karras": "DPM2MKarras",
    "DPM++ SDE Karras": "DPMSDEKarras",
    DDIM: "DDIM",
    PLMS: "PLMS",
    UniPC: "UniPC",
    LCM: "LCM",
    DDPM: "DDPM",
    DEIS: "DEIS",
    "DPM++ 2M SDE": "DPM2MSDE",
    "DPM++ 2M SDE Karras": "DPM2MSDEKarras",
  };

  /**
   * Maps from the orchestration API's sampleMethod value back to the legacy SDK name.
   * Karras variants use the base method + "karras" schedule.
   */
  private readonly sampleMethodMappings: Record<string, SdCppSamplerParams> = {
    EulerA: { sampleMethod: "euler_a" },
    Euler: { sampleMethod: "euler" },
    LMS: { sampleMethod: "lms" },
    Heun: { sampleMethod: "heun" },
    DPM2: { sampleMethod: "dpm2" },
    DPM2A: { sampleMethod: "dpm2_a" },
    DPM2SA: { sampleMethod: "dpmpp_2s_a" },
    DPM2M: { sampleMethod: "dpmpp_2m" },
    DPMSDE: { sampleMethod: "dpmpp_sde" },
    DPMFast: { sampleMethod: "dpm_fast" },
    DPMAdaptive: { sampleMethod: "dpm_adaptive" },
    LMSKarras: { sampleMethod: "lms", schedule: "karras" },
    DPM2Karras: { sampleMethod: "dpm2", schedule: "karras" },
    DPM2AKarras: { sampleMethod: "dpm2_a", schedule: "karras" },
    DPM2SAKarras: { sampleMethod: "dpmpp_2s_a", schedule: "karras" },
    DPM2MKarras: { sampleMethod: "dpmpp_2m", schedule: "karras" },
    DPMSDEKarras: { sampleMethod: "dpmpp_sde", schedule: "karras" },
    DDIM: { sampleMethod: "ddim" },
    PLMS: { sampleMethod: "plms" },
    UniPC: { sampleMethod: "uni_pc" },
    LCM: { sampleMethod: "lcm" },
    DDPM: { sampleMethod: "ddpm" },
    DEIS: { sampleMethod: "deis" },
    DPM2MSDE: { sampleMethod: "dpmpp_2m_sde" },
    DPM2MSDEKarras: { sampleMethod: "dpmpp_2m_sde", schedule: "karras" },
  };

  /**
   * Maps a display name (or legacy SDK name) to the orchestration API sampleMethod params.
   * Accepts either display names ("Euler a") or legacy SDK names ("EulerA").
   */
  MapToSampleMethodParams(displayName: string): SdCppSamplerParams {
    // First try mapping display name → legacy SDK name → sampleMethod
    const legacyName = this.MapToSchedulerName(displayName);
    const params = this.sampleMethodMappings[legacyName];
    if (params) return params;

    // Direct lookup by legacy SDK name (already in legacy format)
    const directParams = this.sampleMethodMappings[displayName];
    if (directParams) return directParams;

    // Default fallback: use the display name as sampleMethod as-is
    return { sampleMethod: displayName };
  }

  GetAvailableSchedulers(): Array<{ label: string; value: string }> {
    return Object.entries(this.schedulerMappings).map(([label]) => ({
      label,
      value: label, // Use display name as value so combobox shows display names
    }));
  }

  MapToSchedulerName(displayName: string): string {
    const mapping = Object.entries(this.schedulerMappings).find(
      ([label]) => label.toLowerCase() === displayName.toLowerCase()
    );

    if (mapping) {
      return mapping[1];
    }

    return displayName;
  }

  MapToDisplayName(schedulerName: string): string {
    const mapping = Object.entries(this.schedulerMappings).find(
      ([, value]) => value.toLowerCase() === schedulerName.toLowerCase()
    );

    if (mapping) {
      return mapping[0];
    }

    return schedulerName;
  }
}
