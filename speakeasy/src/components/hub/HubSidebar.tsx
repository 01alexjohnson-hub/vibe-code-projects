import React from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  BookOpen,
  History,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import SpeakEasyMark from "./SpeakEasyMark";

export type HubPage = "home" | "dictionary" | "history";

interface HubSidebarProps {
  activePage: HubPage;
  onPageChange: (page: HubPage) => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: { id: HubPage; icon: LucideIcon; labelKey: string }[] = [
  { id: "home", icon: Home, labelKey: "hub.nav.home" },
  { id: "dictionary", icon: BookOpen, labelKey: "hub.nav.dictionary" },
  { id: "history", icon: History, labelKey: "hub.nav.history" },
];

/**
 * Hub left rail: logo, Home/Dictionary/History nav, a Settings row pinned to
 * the bottom that opens the Settings modal. Information architecture kept
 * from the Wispr Flow reference (reference/NOTES.md); visual language is the
 * Minimalism & Swiss Style design system (see src/styles/theme.css).
 */
export const HubSidebar: React.FC<HubSidebarProps> = ({
  activePage,
  onPageChange,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-56 h-full bg-surface border-e border-mid-gray/15 shrink-0">
      <div className="px-4 pt-5 pb-4">
        <SpeakEasyMark />
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPageChange(id)}
              className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-start transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary ${
                isActive
                  ? "bg-background-ui/12 text-logo-primary"
                  : "text-text/70 hover:bg-mid-gray/10 hover:text-text"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-3 pb-4 pt-2 border-t border-mid-gray/15">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-start text-text/70 hover:bg-mid-gray/10 hover:text-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-primary"
        >
          <SettingsIcon size={18} className="shrink-0" />
          <span className="truncate">{t("hub.nav.settings")}</span>
        </button>
      </div>
    </div>
  );
};

export default HubSidebar;
