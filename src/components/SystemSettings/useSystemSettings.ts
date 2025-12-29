import { useEffect, useState } from "react";
import { d } from "../../services/Dependencies";
import type { SystemSettings } from "../../services/System/SystemSettings";

interface UseSystemSettingsResult {
  systemSettings: SystemSettings | undefined;
  isLoading: boolean;
  saveSystemSettings: (systemSettings: SystemSettings) => Promise<void>;
}

export const useSystemSettings = (): UseSystemSettingsResult => {
  const [systemSettings, setSystemSettings] = useState<
    SystemSettings | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const blob = () => d.SystemSettingsManagedBlob();

  const loadSettings = async () => {
    const data = await blob().get();
    setSystemSettings(data);
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = blob().subscribe(() => {
      loadSettings();
    });

    loadSettings();

    return () => {
      unsubscribe();
    };
  }, []);

  const saveSystemSettings = async (
    newSettings: SystemSettings
  ): Promise<void> => {
    await blob().save(newSettings);
  };

  return {
    systemSettings,
    isLoading,
    saveSystemSettings,
  };
};
