import { d } from "../Dependencies";
import type { SystemSettings } from "./SystemSettings";

export class SystemSettingsService {
  Get = async (): Promise<SystemSettings | undefined> =>
    await d.SystemSettingsManagedBlob().get();

  Save = async (systemSettings: SystemSettings): Promise<void> =>
    await d.SystemSettingsManagedBlob().save(systemSettings);

  SaveDebounced = async (systemSettings: SystemSettings): Promise<void> =>
    await d.SystemSettingsManagedBlob().saveDebounced(systemSettings);

  SavePendingChanges = async (): Promise<void> =>
    await d.SystemSettingsManagedBlob().savePendingChanges();
}
