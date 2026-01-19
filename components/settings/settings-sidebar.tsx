"use client";

import { IoChevronForward, IoChevronDown } from "react-icons/io5";
import { SettingsView } from "./types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  FiUser,
  FiLink,
  FiGlobe,
  FiBell,
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

export default function SettingsSidebar({
  currentView,
  onViewChange,
  isMobile = false,
  expandedItems = [],
  onToggleExpand,
}: SettingsSidebarProps) {
  const { t } = useTranslation();
  
  const menuItems = [
    { label: t("settings.account_details"), view: "main" as SettingsView, icon: FiUser },
    {
      label: t("settings.connected_devices"),
      view: "connected-devices" as SettingsView,
      icon: FiLink,
    },
    {
      label: t("settings.language_region"),
      view: "language-region" as SettingsView,
      icon: FiGlobe,
    },
    {
      label: t("settings.notifications"),
      view: "notifications" as SettingsView,
      icon: FiBell,
    },
    { label: t("settings.support"), view: "support" as SettingsView, icon: FiHelpCircle },
    {
      label: t("settings.add_new_wallet"),
      view: "add-new-wallet" as SettingsView,
      icon: FiPlus,
    },
    {
      label: t("settings.import_wallet"),
      view: "import-wallet" as SettingsView,
      icon: FiUpload,
    },
  ];

  const getActiveIndex = () => {
    if (currentView === "main") return 0;
    if (currentView === "connected-devices") return 1;
    if (currentView === "language-region") return 2;
    if (currentView === "notifications") return 3;
    if (currentView === "support") return 4;
    if (currentView === "add-new-wallet") return 5;
    if (currentView === "import-wallet") return 6;
    // Check sub-views
    if (
      currentView === "transactions-notifications" ||
      currentView === "rewards-earnings" ||
      currentView === "governance" ||
      currentView === "news-announcements" ||
      currentView === "system-alerts"
    )
      return 3;
    if (
      currentView === "live-status" ||
      currentView === "faqs" ||
      currentView === "tutorials" ||
      currentView === "report-bug" ||
      currentView === "contact-support"
    )
      return 4;
    if (currentView === "view-bug-reports" || currentView === "create-bug-report")
      return 4;
    return -1;
  };

  const activeIndex = getActiveIndex();
  const isItemExpanded = (index: number) => {
    return expandedItems.includes(menuItems[index].label);
  };

  // Mobile view styling
  if (isMobile) {
    return (
      <div className="bg-[#010501] h-[837px] border-2 border-[#1f261e] rounded-[24px] overflow-hidden relative w-[350px]">
        <h2 className="absolute left-[50px] top-[50px] font-semibold text-[20px] text-white leading-normal">
          Settings
        </h2>
        <nav className="absolute left-[-2px] top-[102px] flex flex-col gap-[16px] px-[12px] py-0 w-[350px]">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeIndex === index;
            const isExpanded = isItemExpanded(index);

            return (
              <div key={index}>
                <button
                  onClick={() => {
                    if (onToggleExpand) {
                      onToggleExpand(item.label);
                    } else {
                      onViewChange(item.view);
                    }
                  }}
                  className={`w-full h-[60px] flex items-center justify-between p-[40px] rounded-[8px] font-medium ${isActive
                      ? "bg-[#0b0f0a]"
                      : "bg-transparent"
                    }`}
                >
                  <div className="flex items-center gap-[8px] justify-center">
                    {Icon && <Icon size={24} className="text-white" />}
                    <span className="text-[18px] font-medium leading-normal text-center text-white">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-center relative shrink-0 size-[24px]">
                    <div className="flex-none rotate-90">
                      <div className="relative size-[24px]">
                        <IoChevronForward
                          size={24}
                          className="text-white opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  // Desktop view styling
  return (
    <div className="bg-[#010501] h-[837px] xl:h-[837px] lg:h-[750px] border-2 border-[rgb(31,38,30)] rounded-bl-[24px] rounded-tl-[24px] overflow-hidden relative py-14">
      <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />

      <h2 className="font-semibold text-[24px] xl:text-[24px] lg:text-[20px] text-white px-14 pb-3">
        Settings
      </h2>
      <nav className="flex flex-col gap-[16px] xl:gap-[16px] lg:gap-[12px] px-[12px] py-0 w-[536px] xl:w-[536px] lg:w-[480px]">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeIndex === index;

          return (
            <div key={index}>
              <button
                onClick={() => {
                  onViewChange(item.view);
                }}
                className={`w-full h-[60px] xl:h-[60px] lg:h-[56px] flex items-center justify-between px-[40px] xl:px-[40px] lg:px-[32px] rounded-[8px] font-medium transition-colors ${isActive
                    ? "bg-[#0b0f0a] text-white"
                    : "bg-transparent text-white hover:bg-[#121712]"
                  }`}
              >
                <div className="flex items-center gap-[8px] justify-center">
                  {Icon && <Icon size={24} className="xl:w-6 xl:h-6 lg:w-5 lg:h-5" />}
                  <span className="text-[20px] xl:text-[20px] lg:text-[18px]">{item.label}</span>
                </div>
                <IoChevronForward size={24} className="opacity-60 xl:w-6 xl:h-6 lg:w-5 lg:h-5" />
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}


