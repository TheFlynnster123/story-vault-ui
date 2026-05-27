/** Maps display name → orchestration API sampleMethod + optional schedule fields (sdcpp engine) */
export type SdCppSamplerParams = {
  sampleMethod: string;
  schedule?: string;
};

export class SchedulerMapper {
  private readonly schedulerMappings = {
    Euler: "euler",
    "Euler a": "euler_a",
    Heun: "heun",
    DPM2: "dpm2",
    "DPM++ 2S a": "dpm++2s_a",
    "DPM++ 2M": "dpm++2m",
    "DPM++ 2M v2": "dpm++2mv2",
    IPNDM: "ipndm",
    "IPNDM V": "ipndm_v",
    "DDIM Trailing": "ddim_trailing",
    LCM: "lcm",
    "Res Multistep": "res_multistep",
    "Res 2S": "res_2s",
    TCD: "tcd",
    "ER SDE": "er_sde",
    "DPM++ 2M Karras": "dpm++2m:karras",
    "DPM++ 2M v2 Karras": "dpm++2mv2:karras",
    "DPM++ 2S a Karras": "dpm++2s_a:karras",
  };

  /**
   * Maps legacy scheduler names from older Civitai/SDK metadata to the current
   * Orchestration API SdCppSampleMethod enum. Karras variants use the base
   * sample method plus the separate schedule field.
   */
  private readonly sampleMethodMappings: Record<string, SdCppSamplerParams> = {
    euler: { sampleMethod: "euler" },
    euler_a: { sampleMethod: "euler_a" },
    heun: { sampleMethod: "heun" },
    dpm2: { sampleMethod: "dpm2" },
    "dpm++2s_a": { sampleMethod: "dpm++2s_a" },
    "dpm++2m": { sampleMethod: "dpm++2m" },
    "dpm++2mv2": { sampleMethod: "dpm++2mv2" },
    ipndm: { sampleMethod: "ipndm" },
    ipndm_v: { sampleMethod: "ipndm_v" },
    ddim_trailing: { sampleMethod: "ddim_trailing" },
    lcm: { sampleMethod: "lcm" },
    res_multistep: { sampleMethod: "res_multistep" },
    res_2s: { sampleMethod: "res_2s" },
    tcd: { sampleMethod: "tcd" },
    er_sde: { sampleMethod: "er_sde" },
    Euler: { sampleMethod: "euler" },
    EulerA: { sampleMethod: "euler_a" },
    Heun: { sampleMethod: "heun" },
    DPM2: { sampleMethod: "dpm2" },
    DPM2SA: { sampleMethod: "dpm++2s_a" },
    DPM2M: { sampleMethod: "dpm++2m" },
    DPM2MV2: { sampleMethod: "dpm++2mv2" },
    DPM2SAKarras: { sampleMethod: "dpm++2s_a", schedule: "karras" },
    DPM2MKarras: { sampleMethod: "dpm++2m", schedule: "karras" },
    DPM2MV2Karras: { sampleMethod: "dpm++2mv2", schedule: "karras" },
    IPNDM: { sampleMethod: "ipndm" },
    IPNDMV: { sampleMethod: "ipndm_v" },
    DDIMTrailing: { sampleMethod: "ddim_trailing" },
    LCM: { sampleMethod: "lcm" },
    ResMultistep: { sampleMethod: "res_multistep" },
    Res2S: { sampleMethod: "res_2s" },
    TCD: { sampleMethod: "tcd" },
    ERSDE: { sampleMethod: "er_sde" },
  };

  /**
   * Maps a display name (or legacy SDK name) to the orchestration API sampleMethod params.
   * Accepts either display names ("Euler a") or legacy SDK names ("EulerA").
   */
  MapToSampleMethodParams(displayName: string): SdCppSamplerParams {
    const legacyName = this.MapToSchedulerName(displayName);
    const splitParams = this.splitSampleMethodAndSchedule(legacyName);
    if (splitParams) return splitParams;

    const params = this.sampleMethodMappings[legacyName];
    if (params) return params;

    const directParams = this.sampleMethodMappings[displayName];
    if (directParams) return directParams;

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
    const normalizedSchedulerName = `${schedulerName}`.toLowerCase();
    const legacyParams = this.sampleMethodMappings[schedulerName];
    const normalizedLegacyValue = legacyParams?.schedule
      ? `${legacyParams.sampleMethod}:${legacyParams.schedule}`
      : legacyParams?.sampleMethod;
    if (
      normalizedLegacyValue &&
      normalizedLegacyValue.toLowerCase() !== normalizedSchedulerName
    ) {
      return this.MapToDisplayName(normalizedLegacyValue);
    }

    const mapping = Object.entries(this.schedulerMappings).find(
      ([, value]) => value.toLowerCase() === normalizedSchedulerName
    );

    if (mapping) {
      return mapping[0];
    }

    return schedulerName;
  }

  private splitSampleMethodAndSchedule(value: string): SdCppSamplerParams | undefined {
    const [sampleMethod, schedule] = value.split(":");
    if (!schedule) return undefined;
    return { sampleMethod, schedule };
  }
}
