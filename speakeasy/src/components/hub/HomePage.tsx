import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Flame, Mic, PenLine } from "lucide-react";
import { commands, events, type HistoryEntry } from "@/bindings";
import { useSettings } from "@/hooks/useSettings";
import { useOsType } from "@/hooks/useOsType";
import { formatKeyCombination } from "@/lib/utils/keyboard";
import { formatDate, formatDateTime } from "@/utils/dateFormat";
import { displayText, streakDays, totalWords } from "@/lib/utils/historyStats";

// Bounded sample for the dashboard glance + stat chips — a home screen isn't
// the place for unbounded pagination, and there's no backend stats command
// (see historyStats.ts) so this is computed client-side from what's loaded.
const HOME_FEED_LIMIT = 200;
const RECENT_VISIBLE = 8;

interface HomePageProps {
  onViewHistory: () => void;
}

const StatChip: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
}> = ({ icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-sm">
    <span className="shrink-0">{icon}</span>
    <span className="font-semibold">{value}</span>
    <span className="text-text/60">{label}</span>
  </div>
);

export const HomePage: React.FC<HomePageProps> = ({ onViewHistory }) => {
  const { t, i18n } = useTranslation();
  const osType = useOsType();
  const { settings } = useSettings();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries(null, HOME_FEED_LIMIT);
      if (result.status === "ok") {
        setEntries(result.data.entries);
      }
    } catch (error) {
      console.error("Failed to load history for Home:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Keep stats/recents live as new dictations land, same feed the History
  // page listens to.
  useEffect(() => {
    const unlisten = events.historyUpdatePayload.listen((event) => {
      const payload = event.payload;
      if (payload.action === "added") {
        setEntries((prev) => [payload.entry, ...prev].slice(0, HOME_FEED_LIMIT));
      } else if (payload.action === "updated") {
        setEntries((prev) =>
          prev.map((e) => (e.id === payload.entry.id ? payload.entry : e)),
        );
      } else if (payload.action === "deleted") {
        setEntries((prev) => prev.filter((e) => e.id !== payload.id));
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const stats = useMemo(
    () => ({
      streak: streakDays(entries),
      words: totalWords(entries),
      count: entries.length,
    }),
    [entries],
  );

  const shortcutLabel = useMemo(() => {
    const binding = settings?.bindings?.["transcribe"]?.current_binding;
    if (!binding) return null;
    return formatKeyCombination(binding, osType);
  }, [settings?.bindings, osType]);

  const recent = entries.slice(0, RECENT_VISIBLE);

  const handleCopy = async (entry: HistoryEntry) => {
    const text = displayText(entry);
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((id) => (id === entry.id ? null : id)), 2000);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const todayKey = new Date().toDateString();

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hub.home.welcome")}
        </h1>
        {!loading && entries.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <StatChip
              icon={<Flame size={16} className="text-accent-orange" />}
              value={String(stats.streak)}
              label={
                stats.streak > 0
                  ? t("hub.home.stats.streak")
                  : t("hub.home.stats.streakZero")
              }
            />
            <StatChip
              icon={<PenLine size={16} className="text-logo-primary" />}
              value={String(stats.words)}
              label={t("hub.home.stats.words")}
            />
            <StatChip
              icon={<Mic size={16} className="text-logo-primary" />}
              value={String(stats.count)}
              label={t("hub.home.stats.entries")}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-mid-gray/20 bg-logo-primary/15 p-6">
        <h2
          className="text-xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {shortcutLabel
            ? t("hub.home.callout.title", { key: shortcutLabel })
            : t("hub.home.callout.titleNoBinding")}
        </h2>
        <p className="text-sm text-text/70">{t("hub.home.callout.subtitle")}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-medium text-mid-gray uppercase tracking-wide">
            {t("hub.home.recent.title")}
          </h3>
          {entries.length > RECENT_VISIBLE && (
            <button
              type="button"
              onClick={onViewHistory}
              className="text-xs font-medium text-logo-primary hover:opacity-80 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary"
            >
              {t("hub.home.viewAll")}
            </button>
          )}
        </div>

        <div className="bg-background border border-mid-gray/20 rounded-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-10 text-center text-text/60 text-sm">…</div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Mic size={20} className="text-mid-gray/50" aria-hidden="true" />
              <p className="text-text/60 text-sm">{t("hub.home.recent.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-mid-gray/20">
              {recent.map((entry) => {
                const isToday =
                  new Date(entry.timestamp * 1000).toDateString() === todayKey;
                const text = displayText(entry);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={onViewHistory}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-start hover:bg-mid-gray/5 transition-colors cursor-pointer group"
                    title={
                      isToday
                        ? formatDateTime(String(entry.timestamp), i18n.language)
                        : formatDate(String(entry.timestamp), i18n.language)
                    }
                  >
                    <span className="text-xs text-mid-gray shrink-0 pt-0.5 w-16">
                      {isToday
                        ? new Intl.DateTimeFormat(i18n.language, {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(entry.timestamp * 1000))
                        : formatDate(String(entry.timestamp), i18n.language)}
                    </span>
                    <span className="flex-1 text-sm truncate text-text/90">
                      {text || (
                        <span className="italic text-text/40">
                          {t("settings.history.transcriptionFailed")}
                        </span>
                      )}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(entry);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded text-text/50 hover:text-logo-primary shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary"
                      title={t("hub.home.recent.copy")}
                    >
                      {copiedId === entry.id ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
