import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { GeneralTab } from "./GeneralTab";
import { PolishTab } from "./PolishTab";
import { AdvancedTab } from "./AdvancedTab";
import { PrivacyTab } from "./PrivacyTab";

export type SettingsTab = "general" | "polish" | "advanced" | "privacy";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SettingsTab;
}

const TABS: SettingsTab[] = ["general", "polish", "advanced", "privacy"];

/**
 * Two-pane Settings modal (yt-settings-general.jpg / yt-settings-system-
 * toggles.jpg): a centered dialog over a dimmed backdrop, left nav pane +
 * right content pane. Every existing Handy setting is mapped into one of the
 * 4 tabs below — see each tab component for exactly where.
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  initialTab = "general",
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("hub.settings.title")}
        className="flex w-full max-w-4xl h-[min(700px,90dvh)] rounded-lg border border-mid-gray/15 bg-background shadow-xl overflow-hidden"
      >
        <div className="w-56 shrink-0 bg-surface border-e border-mid-gray/15 flex flex-col py-4">
          <h2 className="px-4 text-xs font-medium text-mid-gray uppercase tracking-wide mb-2">
            {t("hub.settings.title")}
          </h2>
          <nav className="flex flex-col gap-0.5 px-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-start transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary ${
                  activeTab === tab
                    ? "bg-background-ui/12 text-logo-primary"
                    : "text-text/70 hover:bg-mid-gray/10 hover:text-text"
                }`}
              >
                {t(`hub.settings.tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-end px-4 py-2 border-b border-mid-gray/15 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t("hub.settings.close")}
              className="p-1 rounded-md text-mid-gray hover:bg-mid-gray/10 hover:text-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && <GeneralTab />}
            {activeTab === "polish" && <PolishTab />}
            {activeTab === "advanced" && <AdvancedTab />}
            {activeTab === "privacy" && <PrivacyTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SettingsDialog;
