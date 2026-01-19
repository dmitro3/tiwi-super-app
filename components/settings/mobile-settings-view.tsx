"use client";

import { useState } from "react";
import { IoArrowBack, IoChevronDown, IoChevronForward } from "react-icons/io5";
import { SettingsView } from "./types";
import AccountDetails from "./account-details";
import ConnectedDevices from "./connected-devices";
import LanguageRegion from "./language-region";
import Notifications from "./notifications";
import Support from "./support";
import AddNewWallet from "./add-new-wallet";
import ImportWallet from "./import-wallet";
import {
  FiUser,
  FiLink,
  FiGlobe,
  FiBell,
  FiHelpCircle,
  FiPlus,
  FiUpload,
} from "react-icons/fi";

interface MobileSettingsViewProps {
  currentView: SettingsView;
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
  walletName: string;
  walletAddress: string;
  chainIcons: string[];
  hasWallet: boolean;
  isLocalWallet: boolean;
  walletSourceLabel?: string;
  transactionsEnabled?: boolean;
  rewardsEnabled?: boolean;
  governanceEnabled?: boolean;
  newsEnabled?: boolean;
  systemAlertsEnabled?: boolean;
  onToggleTransactions?: (enabled: boolean) => void;
  onToggleRewards?: (enabled: boolean) => void;
  onToggleGovernance?: (enabled: boolean) => void;
  onToggleNews?: (enabled: boolean) => void;
  onToggleSystemAlerts?: (enabled: boolean) => void;
}

const menuItems = [
  { label: "Account Details", view: "main" as SettingsView, icon: FiUser },
  {
    label: "Connected Devices",
    view: "connected-devices" as SettingsView,
    icon: FiLink,
  },
  {
    label: "Language & Region",
    view: "language-region" as SettingsView,
    icon: FiGlobe,
  },
  {
    label: "Notifications",
    view: "notifications" as SettingsView,
    icon: FiBell,
  },
  { label: "Support", view: "support" as SettingsView, icon: FiHelpCircle },
  {
    label: "Add New Wallet",
    view: "add-new-wallet" as SettingsView,
    icon: FiPlus,
  },
  {
    label: "Import Wallet",
    view: "import-wallet" as SettingsView,
    icon: FiUpload,
  },
];

export default function MobileSettingsView({
  currentView,
  onViewChange,
  onGoBack,
  walletName,
  walletAddress,
  chainIcons,
  hasWallet,
  isLocalWallet,
  walletSourceLabel,
  transactionsEnabled = true,
  rewardsEnabled = true,
  governanceEnabled = true,
  newsEnabled = true,
  systemAlertsEnabled = true,
  onToggleTransactions = () => {},
  onToggleRewards = () => {},
  onToggleGovernance = () => {},
  onToggleNews = () => {},
  onToggleSystemAlerts = () => {},
}: MobileSettingsViewProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const getActiveItem = () => {
    if (currentView === "main") return "Account Details";
    if (currentView === "connected-devices") return "Connected Devices";
    if (currentView === "language-region") return "Language & Region";
    if (currentView === "notifications") return "Notifications";
    if (currentView === "support") return "Support";
    if (currentView === "add-new-wallet") return "Add New Wallet";
    if (currentView === "import-wallet") return "Import Wallet";
    // Check if it's a sub-view
    if (
      currentView === "transactions-notifications" ||
      currentView === "rewards-earnings" ||
      currentView === "governance" ||
      currentView === "news-announcements" ||
      currentView === "system-alerts"
    )
      return "Notifications";
    if (
      currentView === "live-status" ||
      currentView === "faqs" ||
      currentView === "tutorials" ||
      currentView === "report-bug" ||
      currentView === "contact-support"
    )
      return "Support";
    if (currentView === "view-bug-reports" || currentView === "create-bug-report")
      return "Support";
    return null;
  };

  const activeItem = getActiveItem();

  const isItemExpanded = (label: string) => expandedItems.includes(label);

  const handleToggleExpand = (itemLabel: string, itemView: SettingsView) => {
    const isExpanded = isItemExpanded(itemLabel);

    if (isExpanded) {
      // If already expanded, collapse
      setExpandedItems((prev) =>
        prev.filter((label) => label !== itemLabel)
      );
      // If collapsing the active item, reset to main view
      if (activeItem === itemLabel) {
        onViewChange("main");
      }
    } else {
      // Expand and navigate - close all others first
      setExpandedItems([itemLabel]);
      onViewChange(itemView);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white font-manrope p-8">
      <div className="bg-[#010501] border-2 border-[#1f261e] overflow-hidden rounded-[24px] min-w-[350px] w-full relative py-14">
      <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />
        <p className=" font-semibold leading-[normal] text-[20px] text-white px-14 pb-4">
          Settings
        </p>
        <nav className="flex flex-col gap-[16px] px-[12px] py-0 w-full">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isExpanded = isItemExpanded(item.label);
            const isActive = activeItem === item.label;

            return (
              <div key={index}>
                <button
                  onClick={() => handleToggleExpand(item.label, item.view)}
                  className={`w-full h-[60px] flex items-center justify-between px-[40px] rounded-[8px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#0b0f0a] text-white"
                      : "bg-transparent text-white hover:bg-[#121712]"
                  }`}
                >
                  <div className="flex items-center gap-[8px] justify-center">
                    {Icon && <Icon size={24} />}
                    <span className="text-[18px]">{item.label}</span>
                  </div>
                  <div className="flex items-center justify-center relative shrink-0 size-[24px]">
                    <div className="flex-none rotate-90">
                      <IoChevronForward
                        size={24}
                        className={`opacity-60 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-2 px-3 pb-4 space-y-4">
                    {item.label === "Account Details" && (
                      <>
                        <button
                          onClick={() => {
                            setExpandedItems((prev) =>
                              prev.filter((label) => label !== item.label)
                            );
                            onViewChange("main");
                          }}
                          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors w-full justify-center"
                        >
                          <IoArrowBack size={16} />
                          Go Back
                        </button>
                        <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-4">
                          <h2 className="text-lg font-semibold text-white mb-4">
                            Account Settings
                          </h2>
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
                      </>
                    )}

                    {item.label === "Connected Devices" &&
                      currentView === "connected-devices" && (
                        <ConnectedDevices
                          onViewChange={onViewChange}
                          onGoBack={onGoBack}
                        />
                      )}

                    {item.label === "Language & Region" &&
                      currentView === "language-region" && (
                        <LanguageRegion onGoBack={onGoBack} />
                      )}

                    {item.label === "Notifications" &&
                      currentView === "notifications" && (
                        <Notifications
                          onViewChange={onViewChange}
                          onGoBack={onGoBack}
                          transactionsEnabled={transactionsEnabled}
                          rewardsEnabled={rewardsEnabled}
                          governanceEnabled={governanceEnabled}
                          newsEnabled={newsEnabled}
                          systemAlertsEnabled={systemAlertsEnabled}
                          onToggleTransactions={onToggleTransactions}
                          onToggleRewards={onToggleRewards}
                          onToggleGovernance={onToggleGovernance}
                          onToggleNews={onToggleNews}
                          onToggleSystemAlerts={onToggleSystemAlerts}
                        />
                      )}

                    {item.label === "Support" && currentView === "support" && (
                      <Support onViewChange={onViewChange} onGoBack={onGoBack} />
                    )}

                    {item.label === "Add New Wallet" &&
                      currentView === "add-new-wallet" && (
                        <AddNewWallet onGoBack={onGoBack} />
                      )}

                    {item.label === "Import Wallet" &&
                      currentView === "import-wallet" && (
                        <ImportWallet onGoBack={onGoBack} />
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

