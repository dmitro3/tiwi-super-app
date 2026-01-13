"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoCloudUploadOutline } from "react-icons/io5";
import type { Advert } from "@/lib/shared/types/adverts";
import { createAdvert, updateAdvert } from "@/lib/frontend/api/adverts";

interface CreateAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNext?: (advertId: string) => void;
  advert?: Advert;
  onSave?: () => void;
  mode?: "create" | "edit";
}

const campaignTypes = [
  "Internal Promotion (TW features, staking pools, governance, updates)",
  "Partner Promotion (External ecosystem partners)",
  "Sponsored Campaign (Paid placement)",
];

const advertFormats = [
  "Banner (Horizontal)",
  "Card (Inline)",
  "Modal (High Placement - timed pop-up)",
];

export default function CreateAdvertModal({
  open,
  onOpenChange,
  onNext,
  advert,
  onSave,
  mode = "create",
}: CreateAdvertModalProps) {
  const [campaignType, setCampaignType] = useState(
    advert?.campaignType || campaignTypes[0]
  );
  const [advertFormat, setAdvertFormat] = useState(
    advert?.advertFormat || advertFormats[0]
  );
  const [headline, setHeadline] = useState(advert?.headline || "");
  const [messageBody, setMessageBody] = useState(advert?.messageBody || "");
  const [advertName, setAdvertName] = useState(advert?.name || "");
  const [imageUrl, setImageUrl] = useState(advert?.imageUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showCampaignTypeDropdown, setShowCampaignTypeDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const campaignTypeRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (campaignTypeRef.current && !campaignTypeRef.current.contains(event.target as Node)) {
        setShowCampaignTypeDropdown(false);
      }
      if (formatRef.current && !formatRef.current.contains(event.target as Node)) {
        setShowFormatDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when modal opens/closes or advert changes
  useEffect(() => {
    if (open && advert && mode === "edit") {
      setCampaignType(advert.campaignType);
      setAdvertFormat(advert.advertFormat);
      setHeadline(advert.headline || "");
      setMessageBody(advert.messageBody || "");
      setAdvertName(advert.name);
      setImageUrl(advert.imageUrl || "");
    } else if (open && mode === "create") {
      setCampaignType(campaignTypes[0]);
      setAdvertFormat(advertFormats[0]);
      setHeadline("");
      setMessageBody("");
      setAdvertName("");
      setImageUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, advert?.id, mode]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileInput = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileInput(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileInput(e.target.files[0]);
    }
  };

  const handleNext = async () => {
    if (mode === "edit" && advert && onSave) {
      try {
        setIsSaving(true);
        await updateAdvert({
          id: advert.id,
          name: advertName,
          campaignType: campaignType as any,
          advertFormat: advertFormat as any,
          headline: headline || undefined,
          messageBody: messageBody || undefined,
          imageUrl: imageUrl || undefined,
        });
        onSave();
      } catch (error) {
        console.error("Error updating advert:", error);
        alert("Failed to save advert. Please try again.");
      } finally {
        setIsSaving(false);
      }
    } else if (mode === "create" && onNext) {
      try {
        setIsSaving(true);
        // Save as draft first
        const newAdvert = await createAdvert({
          name: advertName || headline || "New Advert",
          campaignType: campaignType as any,
          advertFormat: advertFormat as any,
          headline: headline || undefined,
          messageBody: messageBody || undefined,
          imageUrl: imageUrl || undefined,
          status: "draft",
        });
        onNext(newAdvert.id);
      } catch (error) {
        console.error("Error creating advert:", error);
        alert("Failed to create advert. Please try again.");
        setIsSaving(false);
      }
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
                {mode === "edit" ? "Edit Advert" : "Create Advert"}
              </DialogTitle>
              <button
                onClick={() => onOpenChange(false)}
                className="text-[#b1f128] hover:text-[#9dd81f] transition-colors font-medium"
              >
                Cancel
              </button>
            </DialogHeader>

            <div className="space-y-6">
              {/* Advert Name */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Advert Name
                </label>
                <input
                  type="text"
                  value={advertName}
                  onChange={(e) => setAdvertName(e.target.value)}
                  placeholder="Advert Name"
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] text-sm"
                />
              </div>
              {/* Campaign Type */}
              <div className="relative" ref={campaignTypeRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Campaign Type
                </label>
                <button
                  onClick={() => {
                    setShowCampaignTypeDropdown(!showCampaignTypeDropdown);
                    setShowFormatDropdown(false);
                  }}
                  className={`w-full bg-[#0b0f0a] border rounded-lg px-4 py-2.5 text-white text-left flex items-center justify-between transition-colors ${
                    showCampaignTypeDropdown
                      ? "border-[#b1f128]"
                      : "border-[#1f261e] hover:border-[#b1f128]"
                  }`}
                >
                  <span className="text-sm truncate pr-2">{campaignType}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5] shrink-0" />
                </button>
                {showCampaignTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {campaignTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-start gap-3 px-4 py-3 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="campaignType"
                          checked={campaignType === type}
                          onChange={() => {
                            setCampaignType(type);
                            setShowCampaignTypeDropdown(false);
                          }}
                          className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128] mt-0.5 shrink-0"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Advert Format */}
              <div className="relative" ref={formatRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Advert Format
                </label>
                <button
                  onClick={() => {
                    setShowFormatDropdown(!showFormatDropdown);
                    setShowCampaignTypeDropdown(false);
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
                      <label
                        key={format}
                        className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="advertFormat"
                          checked={advertFormat === format}
                          onChange={() => {
                            setAdvertFormat(format);
                            setShowFormatDropdown(false);
                          }}
                          className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                        />
                        <span className="text-sm">{format}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Headline */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Headline (max 60 chars)
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => {
                    if (e.target.value.length <= 60) {
                      setHeadline(e.target.value);
                    }
                  }}
                  maxLength={60}
                  placeholder="Title"
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] text-sm"
                />
                <div className="text-[#7c7c7c] text-xs mt-1 text-right">
                  {headline.length}/60
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Message Body
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={6}
                  placeholder="Message Body"
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none text-sm"
                />
              </div>

              {/* Attach Image */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Attach Image
                </label>
                {imageUrl ? (
                  <div className="relative w-full">
                    <div className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-auto object-contain max-h-64"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl("");
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-[#0b0f0a] bg-opacity-90 hover:bg-opacity-100 border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:text-white transition-colors"
                      title="Remove image"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 w-full px-4 py-2 bg-[#121712] border border-[#1f261e] text-[#b5b5b5] rounded-lg hover:bg-[#1a1f1a] hover:text-white transition-colors text-sm font-medium"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? "border-[#b1f128] bg-[#081f02]"
                        : "border-[#1f261e] bg-[#0b0f0a] hover:border-[#b1f128]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <IoCloudUploadOutline className="w-12 h-12 text-[#b5b5b5] mx-auto mb-3" />
                    <p className="text-[#b5b5b5] text-sm mb-1">
                      Drag & drop files here or browse to upload
                    </p>
                    <button
                      type="button"
                      className="mt-2 px-4 py-2 bg-[#121712] border border-[#1f261e] text-[#b5b5b5] rounded-lg hover:bg-[#1a1f1a] hover:text-white transition-colors text-sm font-medium"
                    >
                      Browse File
                    </button>
                  </div>
                )}
              </div>

              {/* Next/Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="w-full px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : mode === "edit" ? "Save" : "Next"}
                </button>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
