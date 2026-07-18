import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "../ui/Button";

/**
 * Shown when the initial (or a retried) getAppSettings call failed or timed
 * out — settingsStore.refreshSettings() always resolves isLoading to false,
 * so without this the app would otherwise render silently on defaults with
 * no indication anything went wrong. Purely additive: the rest of the Hub
 * keeps rendering underneath on whatever defaults getSetting() falls back
 * to, per the app's fail-open policy (see settingsStore.ts).
 */
export const SettingsLoadFailedBanner: React.FC = () => {
  const { t } = useTranslation();
  const { settingsLoadFailed, refreshSettings } = useSettings();
  const [retrying, setRetrying] = useState(false);

  if (!settingsLoadFailed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshSettings();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-accent-orange/30 bg-accent-orange/10">
      <div className="flex items-start gap-3">
        <TriangleAlert
          size={18}
          className="text-accent-orange shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold">
            {t("errors.settingsLoadFailed.title")}
          </p>
          <p className="text-sm text-text/70">
            {t("errors.settingsLoadFailed.body")}
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRetry}
        disabled={retrying}
        className="shrink-0"
      >
        {t("errors.settingsLoadFailed.retry")}
      </Button>
    </div>
  );
};

export default SettingsLoadFailedBanner;
