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
  hasWallet: boolean;
  isLocalWallet: boolean;
  walletSourceLabel?: string;
  children?: React.ReactNode;
}

export default function DesktopSettingsView({
  currentView,
  onViewChange,
  walletName,
  walletAddress,
  chainIcons,
  hasWallet,
  isLocalWallet,
  walletSourceLabel,
  children,
}: DesktopSettingsViewProps) {
  const showSidebar =
    currentView === "main" ||
    currentView === "connected-devices" ||
    currentView === "language-region" ||
    currentView === "notifications" ||
    currentView === "transactions-notifications" ||
    currentView === "rewards-earnings" ||
    currentView === "governance" ||
    currentView === "news-announcements" ||
    currentView === "system-alerts" ||
    currentView === "support" ||
    currentView === "live-status" ||
    currentView === "faqs" ||
    currentView === "tutorials" ||
    currentView === "report-bug" ||
    currentView === "view-bug-reports" ||
    currentView === "create-bug-report" ||
    currentView === "contact-support" ||
    currentView === "add-new-wallet" ||
    currentView === "import-wallet";

  return (
    <div className="flex">
      {/* Left Sidebar */}
      {showSidebar && (
        <div className="hidden md:block w-[536px] xl:w-[536px] lg:w-[480px] shrink-0">
          <SettingsSidebar
            currentView={currentView}
            onViewChange={onViewChange}
            isMobile={false}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 h-[837px] xl:h-[837px] lg:h-[750px]">
        {currentView === "main" && (
          <div className="bg-[#0B0F0A] h-full rounded-2xl rounded-l-none border border-[#1f261e] overflow-y-auto p-6 md:p-8">
            <AccountDetails
              walletName={walletName}
              walletAddress={walletAddress}
              chainIcons={chainIcons}
              hasWallet={hasWallet}
              isLocalWallet={isLocalWallet}
              walletSourceLabel={walletSourceLabel}
              onViewChange={onViewChange}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

