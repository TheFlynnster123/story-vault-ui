import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlobAPI } from "../../clients/BlobAPI";
import type { SystemSettings } from "../../models";

const GLOBAL_CHAT_ID = "global";
const getQueryKey = () => ["system-settings"];

export interface UseSystemSettingsResult {
  systemSettings: SystemSettings | undefined;
  isLoading: boolean;
  saveSystemSettings: (systemSettings: SystemSettings) => void;
}

export const useSystemSettings = (): UseSystemSettingsResult => {
  const saveSystemSettingsMutation = useSaveSystemSettingsMutation();

  const { data: systemSettings, isLoading } = useQuery({
    queryKey: getQueryKey(),
    queryFn: async () => await GetSystemSettings(),
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    systemSettings,
    isLoading,
    saveSystemSettings: (systemSettings) =>
      saveSystemSettingsMutation.mutateAsync({
        systemSettings,
      }),
  };
};

export const GetSystemSettings = async (): Promise<
  SystemSettings | undefined
> => {
  const blobContent = await new BlobAPI().getBlob(
    GLOBAL_CHAT_ID,
    "system-settings"
  );
  if (!blobContent) return undefined;

  try {
    return JSON.parse(blobContent) as SystemSettings;
  } catch (error) {
    console.error("Failed to parse system settings:", error);
    return undefined;
  }
};

interface SaveSystemSettingsRequest {
  systemSettings: SystemSettings;
}

export const useSaveSystemSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      systemSettings: settings,
    }: SaveSystemSettingsRequest) => {
      const content = JSON.stringify(settings);
      await new BlobAPI().saveBlob(GLOBAL_CHAT_ID, "system-settings", content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(),
      });
    },
  });
};
