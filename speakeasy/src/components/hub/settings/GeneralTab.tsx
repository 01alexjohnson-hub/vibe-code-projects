import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { type } from "@tauri-apps/plugin-os";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { ShortcutInput } from "../../settings/ShortcutInput";
import { PushToTalk } from "../../settings/PushToTalk";
import { MicrophoneSelector } from "../../settings/MicrophoneSelector";
import { MuteWhileRecording } from "../../settings/MuteWhileRecording";
import { AudioFeedback } from "../../settings/AudioFeedback";
import { OutputDeviceSelector } from "../../settings/OutputDeviceSelector";
import { VolumeSlider } from "../../settings/VolumeSlider";
import { AutostartToggle } from "../../settings/AutostartToggle";
import { AppLanguageSelector } from "../../settings/AppLanguageSelector";
import { ThemeSelector } from "../../settings/ThemeSelector";
import { ModelSettingsCard } from "../../settings/general/ModelSettingsCard";
import { ModelsSettings } from "../../settings/models/ModelsSettings";
import { useSettings } from "@/hooks/useSettings";

/**
 * General tab (yt-settings-general.jpg: Shortcuts / Microphone / Languages)
 * — extended with the sound + autostart + appearance settings that were
 * previously scattered across Handy's old General/Advanced/About sections,
 * plus the full speech-model browser (previously its own top-level "Models"
 * sidebar item) behind an expand toggle so it doesn't dominate the tab.
 */
export const GeneralTab: React.FC = () => {
  const { t } = useTranslation();
  const { audioFeedbackEnabled, getSetting } = useSettings();
  const [modelsExpanded, setModelsExpanded] = useState(false);
  const pushToTalk = getSetting("push_to_talk");
  const isLinux = type() === "linux";

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.general.title")}>
        <ShortcutInput shortcutId="transcribe" grouped={true} />
        <PushToTalk descriptionMode="tooltip" grouped={true} />
        {!isLinux && !pushToTalk && (
          <ShortcutInput shortcutId="cancel" grouped={true} />
        )}
        <AutostartToggle descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <ModelSettingsCard />

      <SettingsGroup title={t("settings.sound.title")}>
        <MicrophoneSelector descriptionMode="tooltip" grouped={true} />
        <MuteWhileRecording descriptionMode="tooltip" grouped={true} />
        <AudioFeedback descriptionMode="tooltip" grouped={true} />
        <OutputDeviceSelector
          descriptionMode="tooltip"
          grouped={true}
          disabled={!audioFeedbackEnabled}
        />
        <VolumeSlider disabled={!audioFeedbackEnabled} />
      </SettingsGroup>

      <SettingsGroup title={t("hub.settings.general.appearance")}>
        <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        <ThemeSelector descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setModelsExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-1 text-xs font-medium text-mid-gray uppercase tracking-wide hover:text-text transition-colors cursor-pointer"
        >
          {modelsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {modelsExpanded
            ? t("hub.settings.general.modelsCollapse")
            : t("hub.settings.general.modelsExpand")}
        </button>
        {modelsExpanded && <ModelsSettings />}
      </div>
    </div>
  );
};

export default GeneralTab;
