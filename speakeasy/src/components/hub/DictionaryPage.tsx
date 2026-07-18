import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BookOpen, Plus, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "../ui/Button";
import { AddWordModal } from "./AddWordModal";

/**
 * Restyle of Handy's existing custom-words feature as Wispr's Dictionary
 * screen (yt-hub-dictionary.jpg: header + "Add new", hero card, plain
 * hairline-divided word list — the real captured app screen, not the teal-
 * chip marketing mockup). Same `custom_words` setting/validation as the
 * original CustomWords.tsx component it replaces in the settings tree.
 */
export const DictionaryPage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const customWords = getSetting("custom_words") || [];

  const handleAddWord = (rawWord: string) => {
    const sanitized = rawWord.replace(/[<>"']/g, "");
    if (!sanitized || sanitized.includes(" ") || sanitized.length > 50) return;
    if (customWords.includes(sanitized)) {
      toast.error(
        t("settings.advanced.customWords.duplicate", { word: sanitized }),
      );
      return;
    }
    updateSetting("custom_words", [...customWords, sanitized]);
    setModalOpen(false);
  };

  const handleRemoveWord = (word: string) => {
    updateSetting(
      "custom_words",
      customWords.filter((w) => w !== word),
    );
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hub.dictionary.title")}
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus size={16} />
          {t("hub.dictionary.addNew")}
        </Button>
      </div>

      <div className="rounded-xl border border-mid-gray/20 bg-[color-mix(in_srgb,var(--color-text),transparent_92%)] p-6">
        <h2
          className="text-xl font-semibold mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hub.dictionary.hero.title")}
        </h2>
        <p className="text-sm text-text/70 max-w-xl">
          {t("hub.dictionary.hero.body")}
        </p>
      </div>

      <div className="bg-background border border-mid-gray/20 rounded-lg overflow-hidden">
        {customWords.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BookOpen size={20} className="text-mid-gray/50" aria-hidden="true" />
            <p className="text-text/60 text-sm">{t("hub.dictionary.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-mid-gray/20">
            {customWords.map((word) => (
              <div
                key={word}
                className="flex items-center justify-between px-4 py-2.5 group"
              >
                <span className="text-sm">{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  disabled={isUpdating("custom_words")}
                  aria-label={t("hub.dictionary.remove", { word })}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded text-text/50 hover:text-red-500 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddWordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={handleAddWord}
        disabled={isUpdating("custom_words")}
      />
    </div>
  );
};

export default DictionaryPage;
