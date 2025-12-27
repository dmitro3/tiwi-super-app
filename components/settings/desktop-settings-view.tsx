"use client";

import SettingsSidebar from "./settings-sidebar";
import AccountDetails from "./account-details";
import { SettingsView } from "./types";

interface DesktopSettingsViewProps {
  currentView: SettingsView;
  onViewChange: (view: SettingsView) => void;
  walletName: string;
  walletAddress: string;
  chainIcons: string[];
  children?: React.ReactNode;
}

export default function DesktopSettingsView({
  currentView,
  onViewChange,
  walletName,
  walletAddress,
  chainIcons,
  children,
}: DesktopSettingsViewProps) {
  const showSidebar =
    currentView === "main" ||
    currentView === "security" ||
    currentView === "connected-devices" ||
    currentView === "language-region" ||
    currentView === "notifications" ||
    currentView === "transactions-notifications" ||
    currentView === "rewards-earnings" ||
    currentView === "governance" ||
    currentView === "news-announcements" ||
    currentView === "system-alerts" ||
    currentView === "app-updates-cache" ||
    currentView === "support" ||
    currentView === "live-status" ||
    currentView === "faqs" ||
    currentView === "tutorials" ||
    currentView === "report-bug" ||
    currentView === "contact-support" ||
    currentView === "add-new-wallet" ||
    currentView === "import-wallet";

  return (
    <div className="flex gap-6">
      {/* Left Sidebar */}
      {showSidebar && (
        <div className="hidden md:block w-64 shrink-0">
          <SettingsSidebar
            currentView={currentView}
            onViewChange={onViewChange}
            isMobile={false}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {currentView === "main" && (
          <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              Account Settings
            </h2>
            <AccountDetails
              walletName={walletName}
              walletAddress={walletAddress}
              chainIcons={chainIcons}
              onViewChange={onViewChange}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

