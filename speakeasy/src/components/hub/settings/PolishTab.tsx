import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Dropdown } from "../../ui/Dropdown";
import { ResetButton } from "../../ui/ResetButton";
import { Slider } from "../../ui/Slider";
import { ShortcutInput } from "../../settings/ShortcutInput";
import { PostProcessingSettingsPrompts } from "../../settings/post-processing/PostProcessingSettings";
import { useSettings } from "@/hooks/useSettings";
import type { AppSettings, PolishLevel } from "@/bindings";

const LEVELS: PolishLevel[] = ["none", "light", "medium", "high"];
const OLLAMA_PROVIDER_ID = "ollama";
const DEFAULT_POLISH_TIMEOUT_MS = 5000;

// `polish_llm_timeout_ms` is optional in AppSettings (serde default on the
// Rust side), so reads still need a fallback to the default below.
type SettingsWithTimeout = AppSettings & { polish_llm_timeout_ms?: number };

/**
 * Polish tab — the new local-only polish system from tasks/contract.md
 * ("Frozen settings schema"), replacing the old cloud-provider/API-key UI
 * (removed: showing a provider+API-key picker would contradict the "no
 * account, no cloud" story now that the egress policy only allows localhost
 * Ollama).
 *
 * The Ollama model list reuses the EXISTING fetch_post_process_models
 * command/postProcessModelOptions cache, scoped to a provider id of
 * "ollama" — no new command needed. "Can't reach Ollama" is inferred from
 * that fetch coming back empty; there's no dedicated reachability signal
 * from the backend, so treat this as best-effort, not authoritative.
 */
export const PolishTab: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    getSetting,
    updateSetting,
    isUpdating,
    fetchPostProcessModels,
    postProcessModelOptions,
  } = useSettings();
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [hasFetchedOllama, setHasFetchedOllama] = useState(false);

  const polishLevel = getSetting("polish_level") ?? "light";
  const ollamaModel = getSetting("polish_ollama_model") ?? "qwen3:4b";
  const timeoutMs =
    (settings as SettingsWithTimeout | null)?.polish_llm_timeout_ms ??
    DEFAULT_POLISH_TIMEOUT_MS;
  const setTimeoutMs = (ms: number) =>
    (updateSetting as unknown as (k: string, v: number) => Promise<void>)(
      "polish_llm_timeout_ms",
      ms,
    );
  const ollamaModels = postProcessModelOptions[OLLAMA_PROVIDER_ID] || [];
  const isFetchingModels = isUpdating(
    `post_process_models_fetch:${OLLAMA_PROVIDER_ID}`,
  );
  const ollamaUnreachable =
    hasFetchedOllama && !isFetchingModels && ollamaModels.length === 0;

  const refreshModels = async () => {
    await fetchPostProcessModels(OLLAMA_PROVIDER_ID);
    setHasFetchedOllama(true);
  };

  useEffect(() => {
    if (polishLevel === "medium" || polishLevel === "high") {
      refreshModels();
    }
    // Only re-check when the level crosses into needing Ollama.
  }, [polishLevel]);

  const needsOllama = polishLevel === "medium" || polishLevel === "high";

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("hub.settings.polish.levelLabel")}>
        <div className="p-2 grid grid-cols-1 gap-2">
          {LEVELS.map((level) => {
            const active = polishLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => updateSetting("polish_level", level)}
                className={`text-start px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? "border-logo-primary bg-logo-primary/15"
                    : "border-mid-gray/20 hover:bg-mid-gray/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                      active
                        ? "border-logo-primary bg-logo-primary"
                        : "border-mid-gray/40"
                    }`}
                  />
                  <span className="text-sm font-semibold">
                    {t(`hub.settings.polish.levels.${level}.label`)}
                  </span>
                  {level === "light" && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-accent-forest/15 text-accent-forest">
                      {t("hub.settings.polish.recommended")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text/60 mt-1 ms-5">
                  {t(`hub.settings.polish.levels.${level}.description`)}
                </p>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      {needsOllama && (
        <SettingsGroup>
          <div className="px-4 p-2 space-y-2">
            <div>
              <h3 className="text-sm font-medium">
                {t("hub.settings.polish.modelLabel")}
              </h3>
              <p className="text-xs text-text/60 mt-0.5">
                {t("hub.settings.polish.modelDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dropdown
                options={ollamaModels.map((m) => ({ value: m, label: m }))}
                selectedValue={ollamaModel || null}
                onSelect={(value) =>
                  updateSetting("polish_ollama_model", value)
                }
                placeholder={ollamaModel}
                disabled={isFetchingModels}
                className="flex-1 min-w-0"
              />
              <ResetButton
                onClick={refreshModels}
                disabled={isFetchingModels}
                ariaLabel={t("hub.settings.polish.refreshModels")}
                className="flex h-10 w-10 items-center justify-center shrink-0"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${isFetchingModels ? "animate-spin" : ""}`}
                />
              </ResetButton>
            </div>
            {ollamaUnreachable && (
              <div className="flex items-start gap-2 mt-2 p-2.5 rounded-md bg-accent-orange/10 text-accent-orange text-xs">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {t("hub.settings.polish.ollamaOffline.title")}
                  </p>
                  <p className="opacity-90 mt-0.5">
                    {t("hub.settings.polish.ollamaOffline.body")}
                  </p>
                </div>
              </div>
            )}
            <Slider
              value={timeoutMs / 1000}
              onChange={(seconds) => setTimeoutMs(Math.round(seconds * 1000))}
              min={2}
              max={15}
              step={0.5}
              label={t("hub.settings.polish.timeout.label")}
              description={t("hub.settings.polish.timeout.description")}
              descriptionMode="inline"
              grouped={true}
              formatValue={(v) => `${v.toFixed(1)}s`}
            />
          </div>
        </SettingsGroup>
      )}

      <SettingsGroup>
        <ShortcutInput
          shortcutId="transcribe_with_post_process"
          descriptionMode="tooltip"
          grouped={true}
        />
      </SettingsGroup>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setPromptsExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-1 text-xs font-medium text-mid-gray uppercase tracking-wide hover:text-text transition-colors cursor-pointer"
        >
          {promptsExpanded ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          {t("hub.settings.polish.promptsToggle")}
        </button>
        {promptsExpanded && (
          <SettingsGroup>
            <PostProcessingSettingsPrompts />
          </SettingsGroup>
        )}
      </div>
    </div>
  );
};

export default PolishTab;
