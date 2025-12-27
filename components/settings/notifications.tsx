"use client";

import { IoChevronForward, IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";

interface NotificationsProps {
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
  transactionsEnabled: boolean;
  rewardsEnabled: boolean;
  governanceEnabled: boolean;
  newsEnabled: boolean;
  systemAlertsEnabled: boolean;
  onToggleTransactions: (enabled: boolean) => void;
  onToggleRewards: (enabled: boolean) => void;
  onToggleGovernance: (enabled: boolean) => void;
  onToggleNews: (enabled: boolean) => void;
  onToggleSystemAlerts: (enabled: boolean) => void;
}

export default function Notifications({
  onViewChange,
  onGoBack,
  transactionsEnabled,
  rewardsEnabled,
  governanceEnabled,
  newsEnabled,
  systemAlertsEnabled,
  onToggleTransactions,
  onToggleRewards,
  onToggleGovernance,
  onToggleNews,
  onToggleSystemAlerts,
}: NotificationsProps) {
  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          Go Back
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6">Notifications</h2>

      <div className="space-y-4">
        {/* Transactions Notification */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <button
            onClick={() => onViewChange("transactions-notifications")}
            className="flex-1 text-left"
          >
            <span className="text-base text-[#B5B5B5]">
              Transactions Notification
            </span>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={transactionsEnabled}
              onChange={(e) => onToggleTransactions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
          </label>
        </div>

        {/* Rewards & Earnings */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <button
            onClick={() => onViewChange("rewards-earnings")}
            className="flex-1 text-left"
          >
            <span className="text-base text-[#B5B5B5]">Rewards & Earnings</span>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rewardsEnabled}
              onChange={(e) => onToggleRewards(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
          </label>
        </div>

        {/* Governance */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <button
            onClick={() => onViewChange("governance")}
            className="flex-1 text-left"
          >
            <span className="text-base text-[#B5B5B5]">Governance</span>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={governanceEnabled}
              onChange={(e) => onToggleGovernance(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
          </label>
        </div>

        {/* News & Announcements */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <button
            onClick={() => onViewChange("news-announcements")}
            className="flex-1 text-left"
          >
            <span className="text-base text-[#B5B5B5]">
              News & Announcements
            </span>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={newsEnabled}
              onChange={(e) => onToggleNews(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
          </label>
        </div>

        {/* System Alerts */}
        <div className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]">
          <button
            onClick={() => onViewChange("system-alerts")}
            className="flex-1 text-left"
          >
            <span className="text-base text-[#B5B5B5]">System Alerts</span>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemAlertsEnabled}
              onChange={(e) => onToggleSystemAlerts(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1f261e] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B1F128] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B1F128]"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

