"use client";

import { IoChevronForward, IoChevronDown } from "react-icons/io5";
import { SettingsView } from "./types";
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

interface SettingsSidebarProps {
  currentView: SettingsView;
  onViewChange: (view: SettingsView) => void;
  isMobile?: boolean;
  expandedItems?: string[];
  onToggleExpand?: (item: string) => void;
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

export default function SettingsSidebar({
  currentView,
  onViewChange,
  isMobile = false,
  expandedItems = [],
  onToggleExpand,
}: SettingsSidebarProps) {
  const getActiveIndex = () => {
    if (currentView === "main") return 0;
    if (currentView === "security") return 1;
    if (currentView === "connected-devices") return 2;
    if (currentView === "language-region") return 3;
    if (currentView === "notifications") return 4;
    if (currentView === "app-updates-cache") return 5;
    if (currentView === "support") return 6;
    if (currentView === "add-new-wallet") return 7;
    if (currentView === "import-wallet") return 8;
    // Check sub-views
    if (
      currentView === "change-pin" ||
      currentView === "fraud-alerts" ||
      currentView === "whitelist-addresses"
    )
      return 1;
    if (
      currentView === "transactions-notifications" ||
      currentView === "rewards-earnings" ||
      currentView === "governance" ||
      currentView === "news-announcements" ||
      currentView === "system-alerts"
    )
      return 4;
    if (
      currentView === "live-status" ||
      currentView === "faqs" ||
      currentView === "tutorials" ||
      currentView === "report-bug" ||
      currentView === "contact-support"
    )
      return 6;
    return -1;
  };

  const activeIndex = getActiveIndex();
  const isItemExpanded = (index: number) => {
    return expandedItems.includes(menuItems[index].label);
  };

  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-4">
      <h2 className="text-sm font-semibold text-[#B5B5B5] mb-4 px-2">
        Settings
      </h2>
      <nav className="space-y-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;
          const isExpanded = isMobile && isItemExpanded(index);

          return (
            <div key={index}>
              <button
                onClick={() => {
                  if (isMobile && onToggleExpand) {
                    onToggleExpand(item.label);
                  } else {
                    onViewChange(item.view);
                  }
                }}
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
                {isMobile ? (
                  <IoChevronDown
                    size={16}
                    className={`opacity-60 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                ) : (
                  <IoChevronForward size={16} className="opacity-60" />
                )}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}


