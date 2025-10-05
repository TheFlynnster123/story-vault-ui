export class SchedulerMapper {
  MapScheduler(generatedImageScheduler: string): string {
    switch (generatedImageScheduler.toLowerCase()) {
      case "Euler a".toLowerCase():
        return "EulerA";
      case "Euler".toLowerCase():
        return "Euler";
      case "LMS".toLowerCase():
        return "LMS";
      case "Heun".toLowerCase():
        return "Heun";
      case "DPM2".toLowerCase():
        return "DPM2";
      case "DPM2 a".toLowerCase():
        return "DPM2A";
      case "DPM++ 2S a".toLowerCase():
        return "DPM2SA";
      case "DPM++ 2M".toLowerCase():
        return "DPM2M";
      case "DPM++ SDE".toLowerCase():
        return "DPMSDE";
      case "DPM fast".toLowerCase():
        return "DPMFast";
      case "DPM adaptive".toLowerCase():
        return "DPMAdaptive";
      case "LMS Karras".toLowerCase():
        return "LMSKarras";
      case "DPM2 Karras".toLowerCase():
        return "DPM2Karras";
      case "DPM2 a Karras".toLowerCase():
        return "DPM2AKarras";
      case "DPM++ 2S a karras".toLowerCase():
        return "DPM2SAKarras";
      case "DPM++ 2M karras".toLowerCase():
        return "DPM2MKarras";
      case "DPM++ SDE Karras".toLowerCase():
        return "DPMSDEKarras";
      case "DDIM".toLowerCase():
        return "DDIM";
      case "PLMS".toLowerCase():
        return "PLMS";
      case "UniPC".toLowerCase():
        return "UniPC";
      case "LCM".toLowerCase():
        return "LCM";
      case "DDPM".toLowerCase():
        return "DDPM";
      case "DEIS".toLowerCase():
        return "DEIS";
      case "DPM++ 2M SDE".toLowerCase():
        return "DPM2MSDE";
      case "DPM++ 2M SDE Karras".toLowerCase():
        return "DPM2MSDEKarras";
      default:
        throw new Error(`Unsupported scheduler: ${generatedImageScheduler}`);
    }
  }
}
