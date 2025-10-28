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
