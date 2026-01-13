"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import type { Advert } from "@/lib/shared/types/adverts";

interface ViewAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advert: Advert;
}

export default function ViewAdvertModal({
  open,
  onOpenChange,
  advert,
}: ViewAdvertModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white w-fit max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="p-6">
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <DialogTitle className="text-xl font-semibold text-white">
              View Advert
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#b1f128] hover:text-[#9dd81f] transition-colors font-medium"
            >
              Close
            </button>
          </DialogHeader>

          <div className="space-y-6">
            {/* Attach Image */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Attach Image
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg overflow-hidden flex items-center justify-center">
                {advert.imageUrl ? (
                  <Image
                    src={advert.imageUrl}
                    alt={advert.name}
                    width={400}
                    height={400}
                    className="w-full h-auto object-contain"
                  />
                ) : (
                  <div className="w-full min-h-64 py-12">
                    <span className="text-[#7c7c7c] text-sm">No image uploaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Type */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Campaign Type
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[42px] flex items-center">
                {advert.campaignType || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
            </div>

            {/* Advert Format */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Advert Format
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[42px] flex items-center">
                {advert.advertFormat || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
            </div>

            {/* Headline (max 60 chars) */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Headline (max 60 chars)
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[42px] flex items-center">
                {advert.headline || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
              {advert.headline && (
                <div className="text-[#7c7c7c] text-xs mt-1 text-right">
                  {advert.headline.length}/60
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Message Body
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[150px] whitespace-pre-wrap">
                {advert.messageBody || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
            </div>

            {/* Audience Targeting */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Audience Targeting
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[42px] flex items-center">
                {advert.audienceTargeting || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Priority Level
              </label>
              <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white text-sm min-h-[42px] flex items-center">
                {advert.priorityLevel || <span className="text-[#7c7c7c]">Not set</span>}
              </div>
            </div>

            {/* Compliance Review */}
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Compliance Review
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[#b5b5b5] text-sm">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      advert.complianceNoMisleading
                        ? "bg-[#b1f128] border-[#b1f128]"
                        : "border-[#1f261e] bg-[#0b0f0a]"
                    }`}
                  >
                    {advert.complianceNoMisleading && (
                      <svg
                        className="w-3 h-3 text-[#010501]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span>No misleading API or guarantees</span>
                </div>
                <div className="flex items-center gap-3 text-[#b5b5b5] text-sm">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      advert.complianceNoUnsolicited
                        ? "bg-[#b1f128] border-[#b1f128]"
                        : "border-[#1f261e] bg-[#0b0f0a]"
                    }`}
                  >
                    {advert.complianceNoUnsolicited && (
                      <svg
                        className="w-3 h-3 text-[#010501]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span>No unsolicited contract claims</span>
                </div>
                <div className="flex items-center gap-3 text-[#b5b5b5] text-sm">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      advert.complianceClearRiskLanguage
                        ? "bg-[#b1f128] border-[#b1f128]"
                        : "border-[#1f261e] bg-[#0b0f0a]"
                    }`}
                  >
                    {advert.complianceClearRiskLanguage && (
                      <svg
                        className="w-3 h-3 text-[#010501]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span>Clear risk language (FDIC related)</span>
                </div>
                <div className="flex items-center gap-3 text-[#b5b5b5] text-sm">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      advert.compliancePartnerVerified
                        ? "bg-[#b1f128] border-[#b1f128]"
                        : "border-[#1f261e] bg-[#0b0f0a]"
                    }`}
                  >
                    {advert.compliancePartnerVerified && (
                      <svg
                        className="w-3 h-3 text-[#010501]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span>Partner verified</span>
                </div>
                <div className="flex items-center gap-3 text-[#b5b5b5] text-sm">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      advert.complianceConfirmed
                        ? "bg-[#b1f128] border-[#b1f128]"
                        : "border-[#1f261e] bg-[#0b0f0a]"
                    }`}
                  >
                    {advert.complianceConfirmed && (
                      <svg
                        className="w-3 h-3 text-[#010501]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span>I confirm this campaign is compliant with TW Advertizing guidelines.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

