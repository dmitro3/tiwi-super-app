"use client";

import { IoChevronForward, IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";

interface SecurityProps {
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
}

const securityMenuItems = [
  { label: "Change PIN", view: "change-pin" as SettingsView },
  {
    label: "Fraud Alerts & Suspicious Activity",
    view: "fraud-alerts" as SettingsView,
  },
  { label: "Whitelist Addresses", view: "whitelist-addresses" as SettingsView },
];

export default function Security({ onViewChange, onGoBack }: SecurityProps) {
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

      <h2 className="text-xl font-semibold text-white mb-6">Security</h2>

      <nav className="space-y-1">
        {securityMenuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => onViewChange(item.view)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#B5B5B5] hover:bg-[#121712] transition-colors"
          >
            <span>{item.label}</span>
            <IoChevronForward size={16} className="opacity-60" />
          </button>
        ))}
      </nav>
    </div>
  );
}

