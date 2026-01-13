"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline } from "react-icons/io5";
import { updateAdvert } from "@/lib/frontend/api/adverts";

interface TargetAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertId?: string;
  onPublish?: () => void;
}

const audienceTargeting = [
  "All Users",
  "Token Holders",
  "Traders",
  "Stakers",
  "LPs",
  "DAO Voters",
];

const advertFormats = [
  "Banner (Horizontal)",
  "Card (Inline)",
  "Modal (High Placement - timed pop-up)",
];

const priorityLevels = [
  "Normal",
  "Mid-tier",
  "Sponsored (locks placement)",
];

const complianceItems = [
  "No misleading API or guarantees",
  "No unsolicited contract claims",
  "Clear risk language (FDIC related)",
  "Partner verified",
];

export default function TargetAdvertModal({
  open,
  onOpenChange,
  advertId,
  onPublish,
}: TargetAdvertModalProps) {
  const [audience, setAudience] = useState(audienceTargeting[0]);
  const [advertFormat, setAdvertFormat] = useState(advertFormats[0]);
  const [priority, setPriority] = useState(priorityLevels[0]);
  const [compliance, setCompliance] = useState<Record<string, boolean>>({
    "No misleading API or guarantees": false,
    "No unsolicited contract claims": false,
    "Clear risk language (FDIC related)": false,
    "Partner verified": false,
  });
  const [confirmation, setConfirmation] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const audienceRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(event.target as Node)) {
        setShowAudienceDropdown(false);
      }
      if (formatRef.current && !formatRef.current.contains(event.target as Node)) {
        setShowFormatDropdown(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleComplianceChange = (item: string) => {
    setCompliance((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handlePublish = async () => {
    if (!advertId) {
      alert("Advert ID is required");
      return;
    }

    try {
      setIsPublishing(true);
      await updateAdvert({
        id: advertId,
        audienceTargeting: audience as any,
        priorityLevel: priority as any,
        complianceNoMisleading: compliance["No misleading API or guarantees"],
        complianceNoUnsolicited: compliance["No unsolicited contract claims"],
        complianceClearRiskLanguage: compliance["Clear risk language (FDIC related)"],
        compliancePartnerVerified: compliance["Partner verified"],
        complianceConfirmed: confirmation,
        status: "published",
      });
      
      if (onPublish) {
        onPublish();
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error publishing advert:", error);
      alert("Failed to publish advert. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white w-fit max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="p-6">
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <DialogTitle className="text-xl font-semibold text-white">
              Target User
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#b1f128] hover:text-[#9dd81f] transition-colors font-medium"
            >
              Cancel
            </button>
          </DialogHeader>

          <div className="space-y-6">
            {/* Target Section */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4">Target</h3>
              
              {/* Audience Targeting */}
              <div className="relative mb-4" ref={audienceRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Audience Targeting
                </label>
                <button
                  onClick={() => {
                    setShowAudienceDropdown(!showAudienceDropdown);
                    setShowFormatDropdown(false);
                    setShowPriorityDropdown(false);
                  }}
                  className={`w-full bg-[#0b0f0a] border rounded-lg px-4 py-2.5 text-white text-left flex items-center justify-between transition-colors ${
                    showAudienceDropdown
                      ? "border-[#b1f128]"
                      : "border-[#1f261e] hover:border-[#b1f128]"
                  }`}
                >
                  <span className="text-sm">{audience}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5] shrink-0" />
                </button>
                {showAudienceDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {audienceTargeting.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setAudience(item);
                          setShowAudienceDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors text-sm"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advert Format */}
              <div className="relative mb-4" ref={formatRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Advert Format
                </label>
                <button
                  onClick={() => {
                    setShowFormatDropdown(!showFormatDropdown);
                    setShowAudienceDropdown(false);
                    setShowPriorityDropdown(false);
                  }}
                  className={`w-full bg-[#0b0f0a] border rounded-lg px-4 py-2.5 text-white text-left flex items-center justify-between transition-colors ${
                    showFormatDropdown
                      ? "border-[#b1f128]"
                      : "border-[#1f261e] hover:border-[#b1f128]"
                  }`}
                >
                  <span className="text-sm">{advertFormat}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5] shrink-0" />
                </button>
                {showFormatDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                    {advertFormats.map((format) => (
                      <button
                        key={format}
                        onClick={() => {
                          setAdvertFormat(format);
                          setShowFormatDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors text-sm"
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Level */}
              <div className="relative" ref={priorityRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Priority Level
                </label>
                <button
                  onClick={() => {
                    setShowPriorityDropdown(!showPriorityDropdown);
                    setShowAudienceDropdown(false);
                    setShowFormatDropdown(false);
                  }}
                  className={`w-full bg-[#0b0f0a] border rounded-lg px-4 py-2.5 text-white text-left flex items-center justify-between transition-colors ${
                    showPriorityDropdown
                      ? "border-[#b1f128]"
                      : "border-[#1f261e] hover:border-[#b1f128]"
                  }`}
                >
                  <span className="text-sm">{priority}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5] shrink-0" />
                </button>
                {showPriorityDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                    {priorityLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setPriority(level);
                          setShowPriorityDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors text-sm"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Review */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4">Compliance Review</h3>
              <div className="space-y-3">
                {complianceItems.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-3 text-[#b5b5b5] text-sm cursor-pointer hover:text-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={compliance[item]}
                      onChange={() => handleComplianceChange(item)}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128] rounded border-[#1f261e] bg-[#0b0f0a]"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="flex items-center gap-3 text-[#b5b5b5] text-sm cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={confirmation}
                  onChange={(e) => setConfirmation(e.target.checked)}
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128] rounded border-[#1f261e] bg-[#0b0f0a]"
                />
                <span>I confirm this campaign is compliant with TW Advertizing guidelines.</span>
              </label>
            </div>

            {/* Publish Button */}
            <div className="pt-4">
              <button
                onClick={handlePublish}
                disabled={!confirmation || isPublishing || !advertId}
                className="w-full px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
