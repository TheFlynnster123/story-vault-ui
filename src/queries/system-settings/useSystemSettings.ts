import { useQuery, useMutation } from "@tanstack/react-query";
import type { SystemSettings } from "../../models";
import { d } from "../../app/Dependencies/Dependencies";
import { SYSTEM_SETTINGS_QUERY_KEY } from "./SystemSettingsService";

export interface UseSystemSettingsResult {
  systemSettings: SystemSettings | undefined;
  isLoading: boolean;
  saveSystemSettings: (systemSettings: SystemSettings) => void;
}

export const useSystemSettings = (): UseSystemSettingsResult => {
  const { data: systemSettings, isLoading } = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => await d.SystemSettingsService().fetchSystemSettings(),
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveSystemSettingsMutation = useMutation({
    mutationFn: async ({
      systemSettings: settings,
    }: SaveSystemSettingsRequest) => {
      await d.SystemSettingsService().save(settings);
    },
    onSuccess: (_, variables) => {
      d.QueryClient().setQueryData(
        SYSTEM_SETTINGS_QUERY_KEY,
        variables.systemSettings
      );
      d.QueryClient().invalidateQueries({
        queryKey: SYSTEM_SETTINGS_QUERY_KEY,
      });
    },
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

interface SaveSystemSettingsRequest {
  systemSettings: SystemSettings;
}
