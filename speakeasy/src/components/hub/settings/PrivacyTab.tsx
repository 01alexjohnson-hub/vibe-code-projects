import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ShieldCheck, Wifi } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../../settings/AppDataDirectory";
import { ShowWhatsNewOnUpdate } from "../../settings/ShowWhatsNewOnUpdate";
import { LogDirectory } from "../../settings/debug";

/**
 * Data & Privacy tab — the honesty page from the task brief: on-device
 * disclosure + the exhaustive network-destination list from the egress
 * policy (tasks/contract.md), plus the version/source/acknowledgments block
 * that used to live in Handy's "About" section (no natural home in the
 * General/Polish/Advanced split, and it's inherently about what LocalFlow
 * is/does — fits here).
 */
export const PrivacyTab: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch((error) => {
        console.error("Failed to get app version:", error);
        setVersion("");
      });
  }, []);

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <SettingsGroup>
        <div className="px-4 p-3 flex items-start gap-3">
          <ShieldCheck
            size={20}
            className="text-accent-forest shrink-0 mt-0.5"
          />
          <div>
            <h3 className="text-sm font-semibold">
              {t("hub.settings.privacy.onDevice.title")}
            </h3>
            <p className="text-sm text-text/70 mt-1">
              {t("hub.settings.privacy.onDevice.body")}
            </p>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("hub.settings.privacy.network.title")}>
        <div className="px-4 p-3 space-y-3">
          <div className="flex items-start gap-3">
            <Wifi size={16} className="text-text/50 shrink-0 mt-0.5" />
            <p className="text-sm text-text/80">
              {t("hub.settings.privacy.network.model")}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Wifi size={16} className="text-text/50 shrink-0 mt-0.5" />
            <p className="text-sm text-text/80">
              {t("hub.settings.privacy.network.ollama")}
            </p>
          </div>
          <p className="text-xs text-text/50 pt-1 border-t border-mid-gray/10">
            {t("hub.settings.privacy.network.none")}
          </p>
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
        <LogDirectory grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("hub.settings.privacy.about.title")}>
        <SettingContainer
          title={t("settings.about.version.title")}
          description={t("settings.about.version.description")}
          grouped={true}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="text-sm font-mono">v{version}</span>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.sourceCode.title")}
          description={t("settings.about.sourceCode.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => openUrl("https://github.com/cjpais/Handy")}
          >
            {t("settings.about.sourceCode.button")}
          </Button>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.acknowledgments.ggml.title")}
          description={t("settings.about.acknowledgments.ggml.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="text-sm text-mid-gray">
            {t("settings.about.acknowledgments.ggml.details")}
          </div>
        </SettingContainer>
        <ShowWhatsNewOnUpdate descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>
    </div>
  );
};

export default PrivacyTab;
