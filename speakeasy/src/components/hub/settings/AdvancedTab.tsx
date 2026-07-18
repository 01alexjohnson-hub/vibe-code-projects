import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { Slider } from "../../ui/Slider";
import { ShowOverlay } from "../../settings/ShowOverlay";
import { ModelUnloadTimeoutSetting } from "../../settings/ModelUnloadTimeout";
import { StartHidden } from "../../settings/StartHidden";
import { ShowTrayIcon } from "../../settings/ShowTrayIcon";
import { ExperimentalToggle } from "../../settings/ExperimentalToggle";
import { PasteMethodSetting } from "../../settings/PasteMethod";
import { TypingToolSetting } from "../../settings/TypingTool";
import { ClipboardHandlingSetting } from "../../settings/ClipboardHandling";
import { AutoSubmit } from "../../settings/AutoSubmit";
import { VoiceActivityDetection } from "../../settings/VoiceActivityDetection";
import { AppendTrailingSpace } from "../../settings/AppendTrailingSpace";
import { HistoryLimit } from "../../settings/HistoryLimit";
import { RecordingRetentionPeriodSelector } from "../../settings/RecordingRetentionPeriod";
import { PostProcessingToggle } from "../../settings/PostProcessingToggle";
import { KeyboardImplementationSelector } from "../../settings/debug/KeyboardImplementationSelector";
import { AccelerationSelector } from "../../settings/AccelerationSelector";
import { LazyStreamClose } from "../../settings/LazyStreamClose";
import { LogLevelSelector } from "../../settings/debug/LogLevelSelector";
import { WhatsNewPreview } from "../../settings/debug/WhatsNewPreview";
import { LiveLogViewer } from "../../settings/debug/LiveLogViewer";
import { PasteDelay } from "../../settings/debug/PasteDelay";
import { RecordingBuffer } from "../../settings/debug/RecordingBuffer";
import { WordCorrectionThreshold } from "../../settings/debug/WordCorrectionThreshold";
import { AlwaysOnMicrophone } from "../../settings/AlwaysOnMicrophone";
import { ClamshellMicrophoneSelector } from "../../settings/ClamshellMicrophoneSelector";
import { SoundPicker } from "../../settings/SoundPicker";
import { useSettings } from "@/hooks/useSettings";

/**
 * Advanced tab — every setting from Handy's old Advanced + Debug sidebar
 * sections (CustomWords moved out to the Dictionary page; the legacy cloud
 * post-processing provider/API-key UI moved to Polish/removed — see
 * PolishTab.tsx). Debug mode is still a hidden power-user reveal
 * (Ctrl/Cmd+Shift+D, unchanged from Handy — App.tsx owns that shortcut).
 */
export const AdvancedTab: React.FC = () => {
  const { t } = useTranslation();
  const { settings, getSetting, updateSetting, isUpdating } = useSettings();
  const experimentalEnabled = getSetting("experimental_enabled") || false;
  const debugMode = settings?.debug_mode === true;

  const spacebarPtt = getSetting("spacebar_ptt") ?? false;
  const spacebarThresholdMs = getSetting("spacebar_hold_threshold_ms") ?? 350;

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.advanced.groups.app")}>
        <StartHidden descriptionMode="tooltip" grouped={true} />
        <ShowTrayIcon descriptionMode="tooltip" grouped={true} />
        <ShowOverlay descriptionMode="tooltip" grouped={true} />
        <ModelUnloadTimeoutSetting descriptionMode="tooltip" grouped={true} />
        <ExperimentalToggle descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("settings.advanced.groups.output")}>
        <PasteMethodSetting descriptionMode="tooltip" grouped={true} />
        <TypingToolSetting descriptionMode="tooltip" grouped={true} />
        <ClipboardHandlingSetting descriptionMode="tooltip" grouped={true} />
        <AutoSubmit descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("settings.advanced.groups.transcription")}>
        <VoiceActivityDetection descriptionMode="tooltip" grouped={true} />
        <AppendTrailingSpace descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("settings.advanced.groups.history")}>
        <HistoryLimit descriptionMode="tooltip" grouped={true} />
        <RecordingRetentionPeriodSelector descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("hub.settings.advanced.spacebarGroup")}>
        <ToggleSwitch
          checked={spacebarPtt}
          onChange={(checked) => updateSetting("spacebar_ptt", checked)}
          isUpdating={isUpdating("spacebar_ptt")}
          label={t("hub.settings.advanced.spacebarPtt.label")}
          description={t("hub.settings.advanced.spacebarPtt.description")}
          descriptionMode="inline"
          grouped={true}
        />
        {spacebarPtt && (
          <Slider
            value={spacebarThresholdMs}
            onChange={(value) =>
              updateSetting("spacebar_hold_threshold_ms", Math.round(value))
            }
            min={150}
            max={800}
            step={10}
            label={t("hub.settings.advanced.spacebarThreshold.label")}
            description={t("hub.settings.advanced.spacebarThreshold.description")}
            descriptionMode="inline"
            grouped={true}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
        )}
      </SettingsGroup>

      {experimentalEnabled && (
        <SettingsGroup title={t("settings.advanced.groups.experimental")}>
          <PostProcessingToggle descriptionMode="tooltip" grouped={true} />
          <KeyboardImplementationSelector descriptionMode="tooltip" grouped={true} />
          <AccelerationSelector descriptionMode="tooltip" grouped={true} />
          <LazyStreamClose descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>
      )}

      {debugMode && (
        <SettingsGroup title={t("settings.debug.title")}>
          <LogLevelSelector grouped={true} />
          <WhatsNewPreview descriptionMode="tooltip" grouped={true} />
          <SoundPicker
            label={t("settings.debug.soundTheme.label")}
            description={t("settings.debug.soundTheme.description")}
          />
          <WordCorrectionThreshold descriptionMode="tooltip" grouped={true} />
          <PasteDelay descriptionMode="tooltip" grouped={true} />
          <PasteDelay
            descriptionMode="tooltip"
            grouped={true}
            settingKey="paste_delay_after_ms"
            labelKey="settings.debug.pasteDelayAfter.title"
            descriptionKey="settings.debug.pasteDelayAfter.description"
          />
          <RecordingBuffer descriptionMode="tooltip" grouped={true} />
          <AlwaysOnMicrophone descriptionMode="tooltip" grouped={true} />
          <ClamshellMicrophoneSelector descriptionMode="tooltip" grouped={true} />
          <LiveLogViewer descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>
      )}
    </div>
  );
};

export default AdvancedTab;
