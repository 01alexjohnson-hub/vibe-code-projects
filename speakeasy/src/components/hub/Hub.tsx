import React, { useState } from "react";
import AccessibilityPermissions from "../AccessibilityPermissions";
import { HubSidebar, type HubPage } from "./HubSidebar";
import { HomePage } from "./HomePage";
import { DictionaryPage } from "./DictionaryPage";
import { HistoryPage } from "./HistoryPage";
import { SettingsDialog } from "./settings/SettingsDialog";
import { SettingsLoadFailedBanner } from "./SettingsLoadFailedBanner";

/**
 * The main window shell: Wispr-style Hub (left rail + Home/Dictionary/
 * History pages), Settings as a modal rather than a 4th page. Replaces the
 * old flat Sidebar + renderSettingsContent tree in App.tsx.
 */
export const Hub: React.FC = () => {
  const [activePage, setActivePage] = useState<HubPage>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex-1 flex overflow-hidden">
      <HubSidebar
        activePage={activePage}
        onPageChange={setActivePage}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-4 space-y-3">
            <SettingsLoadFailedBanner />
            <AccessibilityPermissions />
          </div>
          {activePage === "home" && (
            <HomePage onViewHistory={() => setActivePage("history")} />
          )}
          {activePage === "dictionary" && <DictionaryPage />}
          {activePage === "history" && <HistoryPage />}
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Hub;
