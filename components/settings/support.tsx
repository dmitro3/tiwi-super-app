"use client";

import { IoChevronForward, IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";

interface SupportProps {
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
}

export default function Support({ onViewChange, onGoBack }: SupportProps) {
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

      <h2 className="text-2xl font-semibold text-white mb-6">Support</h2>

      <div className="space-y-3">
        <button
          onClick={() => onViewChange("contact-us")}
          className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
        >
          <span className="text-base text-[#B5B5B5]">Contact Us</span>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        <button
          onClick={() => onViewChange("faqs")}
          className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
        >
          <span className="text-base text-[#B5B5B5]">FAQs</span>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        <button
          onClick={() => onViewChange("report-bug")}
          className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
        >
          <span className="text-base text-[#B5B5B5]">Report a Bug</span>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        <button
          onClick={() => onViewChange("request-feature")}
          className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
        >
          <span className="text-base text-[#B5B5B5]">Request a Feature</span>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>

        <button
          onClick={() => onViewChange("legal-privacy")}
          className="w-full flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e] hover:bg-[#121712] transition-colors text-left"
        >
          <span className="text-base text-[#B5B5B5]">Legal & Privacy</span>
          <IoChevronForward size={20} className="text-[#B5B5B5] opacity-60" />
        </button>
      </div>
    </div>
  );
}

