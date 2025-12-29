import { d } from "../Dependencies";
import type { SystemSettings } from "./SystemSettings";

export class SystemSettingsService {
  get = async (): Promise<SystemSettings | undefined> => {
    return await d.SystemSettingsManagedBlob().get();
  };

  save = async (systemSettings: SystemSettings): Promise<void> => {
    await d.SystemSettingsManagedBlob().save(systemSettings);
  };

  saveDebounced = async (systemSettings: SystemSettings): Promise<void> => {
    await d.SystemSettingsManagedBlob().saveDebounced(systemSettings);
  };
}
