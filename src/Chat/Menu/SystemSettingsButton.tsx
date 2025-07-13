import { RiSettings3Fill } from "react-icons/ri";
import { SystemSettingsDialog } from "../../SystemSettings";
import { useState } from "react";

export const SystemSettingsButton = () => {
  const [showSystemSettings, setShowSystemSettings] = useState<boolean>(false);

  return (
    <>
      <button
        className="system-settings-button"
        onClick={() => setShowSystemSettings(true)}
        aria-label="Open system settings"
        title="System Settings"
      >
        <RiSettings3Fill />
      </button>
      <SystemSettingsDialog
        isOpen={showSystemSettings}
        onClose={() => setShowSystemSettings(false)}
      />
    </>
  );
};
