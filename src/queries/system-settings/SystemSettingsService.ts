import { d } from "../../app/Dependencies/Dependencies";
import { BlobAPI } from "../../clients/BlobAPI";
import type { SystemSettings } from "../../models";

export const SYSTEM_SETTINGS_QUERY_KEY = ["system-settings"];

const GLOBAL_CHAT_ID = "global";
const SYSTEM_SETTINGS_BLOB_NAME = "system-settings";

export class SystemSettingsService {
  get = async (): Promise<SystemSettings | undefined> =>
    await d.QueryClient().ensureQueryData({
      queryKey: SYSTEM_SETTINGS_QUERY_KEY,
      queryFn: async () => await this.fetchSystemSettings(),
      revalidateIfStale: false,
    });

  save = async (systemSettings: SystemSettings): Promise<void> => {
    const blobContent = JSON.stringify(systemSettings);
    await new BlobAPI().saveBlob(
      GLOBAL_CHAT_ID,
      SYSTEM_SETTINGS_BLOB_NAME,
      blobContent
    );

    d.QueryClient().setQueryData(SYSTEM_SETTINGS_QUERY_KEY, systemSettings);
  };

  fetchSystemSettings = async (): Promise<SystemSettings | undefined> => {
    try {
      const blobContent = await new BlobAPI().getBlob(
        GLOBAL_CHAT_ID,
        SYSTEM_SETTINGS_BLOB_NAME
      );

      if (!blobContent) return undefined;

      return JSON.parse(blobContent) as SystemSettings;
    } catch (e) {
      // If blob doesn't exist (404), return undefined
      if (e instanceof Error && e.message.includes("Blob not found")) {
        return undefined;
      }

      // For other errors, log and return undefined
      d.ErrorService().log("Failed to fetch system settings", e);
      return undefined;
    }
  };
}
