"use client";

import { useState, useEffect } from "react";
import { IoArrowBack, IoChevronDown } from "react-icons/io5";
import { SettingsView } from "./types";
import AccountDetails from "./account-details";
import Security from "./security";
import ConnectedDevices from "./connected-devices";
import LanguageRegion from "./language-region";
import Notifications from "./notifications";
import AppUpdatesCache from "./app-updates-cache";
import Support from "./support";
import AddNewWallet from "./add-new-wallet";
import ImportWallet from "./import-wallet";
import {
  FiUser,
  FiShield,
  FiLink,
  FiGlobe,
  FiBell,
  FiRefreshCw,
  FiHelpCircle,
  FiPlus,
  FiUpload,
} from "react-icons/fi";

interface Device {
  id: number;
  device: string;
  ip: string;
  location: string;
  status: string;
  isActive: boolean;
}

interface MobileSettingsViewProps {
  currentView: SettingsView;
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
  walletName: string;
  walletAddress: string;
  chainIcons: string[];
  connectedDevices?: Device[];
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
  onTerminateDevice?: (device: Device) => void;
  onTerminateAll?: () => void;
}

const menuItems = [
  { label: "Account Details", view: "main" as SettingsView, icon: FiUser },
  { label: "Security", view: "security" as SettingsView, icon: FiShield },
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
  {
    label: "App Updates & Cache",
    view: "app-updates-cache" as SettingsView,
    icon: FiRefreshCw,
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
  connectedDevices = [],
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
  onTerminateDevice = () => {},
  onTerminateAll = () => {},
}: MobileSettingsViewProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const getActiveItem = () => {
    if (currentView === "main") return "Account Details";
    if (currentView === "security") return "Security";
    if (currentView === "connected-devices") return "Connected Devices";
    if (currentView === "language-region") return "Language & Region";
    if (currentView === "notifications") return "Notifications";
    if (currentView === "app-updates-cache") return "App Updates & Cache";
    if (currentView === "support") return "Support";
    if (currentView === "add-new-wallet") return "Add New Wallet";
    if (currentView === "import-wallet") return "Import Wallet";
    // Check if it's a sub-view
    if (
      currentView === "change-pin" ||
      currentView === "fraud-alerts" ||
      currentView === "whitelist-addresses"
    )
      return "Security";
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
    return null;
  };

  const activeItem = getActiveItem();

  // Auto-expand active item
  useEffect(() => {
    if (activeItem && !expandedItems.includes(activeItem)) {
      setExpandedItems([activeItem]);
    }
  }, [activeItem, expandedItems]);

  const isItemExpanded = (label: string) => expandedItems.includes(label);

  const handleToggleExpand = (itemLabel: string, itemView: SettingsView) => {
    const isExpanded = isItemExpanded(itemLabel);
    const isActive = activeItem === itemLabel;

    if (isExpanded && isActive) {
      // If already expanded and active, collapse
      setExpandedItems((prev) =>
        prev.filter((label) => label !== itemLabel)
      );
      onViewChange("main");
    } else {
      // Expand and navigate
      setExpandedItems((prev) =>
        prev.includes(itemLabel)
          ? prev
          : [...prev.filter((label) => label !== itemLabel), itemLabel]
      );
      onViewChange(itemView);
    }
  };

  return (
    <div className="min-h-screen bg-[#010501] text-white font-manrope px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-4">
        <h2 className="text-sm font-semibold text-[#B5B5B5] mb-4 px-2">
          Settings
        </h2>
        <nav className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isExpanded = isItemExpanded(item.label);
            const isActive = activeItem === item.label;

            return (
              <div key={index}>
                <button
                  onClick={() => handleToggleExpand(item.label, item.view)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#081F02] text-[#B1F128]"
                      : "text-[#B5B5B5] hover:bg-[#121712]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon size={16} />}
                    <span>{item.label}</span>
                  </div>
                  <IoChevronDown
                    size={16}
                    className={`opacity-60 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded Content */}
                {isExpanded && isActive && (
                  <div className="mt-2 px-3 pb-4 space-y-4">
                    {item.label === "Account Details" && currentView === "main" && (
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
                            onViewChange={onViewChange}
                          />
                        </div>
                      </>
                    )}

                    {item.label === "Security" && currentView === "security" && (
                      <Security onViewChange={onViewChange} onGoBack={onGoBack} />
                    )}

                    {item.label === "Connected Devices" &&
                      currentView === "connected-devices" && (
                        <ConnectedDevices
                          devices={connectedDevices}
                          onViewChange={onViewChange}
                          onGoBack={onGoBack}
                          onTerminateDevice={onTerminateDevice}
                          onTerminateAll={onTerminateAll}
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

                    {item.label === "App Updates & Cache" &&
                      currentView === "app-updates-cache" && (
                        <AppUpdatesCache onGoBack={onGoBack} />
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

