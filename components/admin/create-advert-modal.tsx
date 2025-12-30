"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoCloudUploadOutline, IoImageOutline } from "react-icons/io5";

interface CreateAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const campaignTypes = ["Product", "Service", "Region", "URL", "API"];
const advertFormats = ["Image", "Video", "Image & Video"];

export default function CreateAdvertModal({
  open,
  onOpenChange,
}: CreateAdvertModalProps) {
  const [campaignType, setCampaignType] = useState("");
  const [advertName, setAdvertName] = useState("");
  const [advertId, setAdvertId] = useState("ADVERT ID (auto generated)");
  const [message, setMessage] = useState("");
  const [advertFormat, setAdvertFormat] = useState("Image");
  const [showCampaignTypeDropdown, setShowCampaignTypeDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const campaignTypeRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Auto-generate advert ID
      setAdvertId(`ADV-${Date.now().toString().slice(-6)}`);
    }
  }, [open]);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle file upload
      console.log("File dropped:", e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Handle file upload
      console.log("File selected:", e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Create Advert
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b5b5b5] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
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
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{campaignType || "Select campaign type"}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showCampaignTypeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {campaignTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="campaignType"
                      checked={campaignType === type}
                      onChange={() => {
                        setCampaignType(type);
                        setShowCampaignTypeDropdown(false);
                      }}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Advert Name */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              ADVERT NAME
            </label>
            <input
              type="text"
              value={advertName}
              onChange={(e) => setAdvertName(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="Enter advert name"
            />
          </div>

          {/* Advert ID (Auto-generated) */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              ADVERT ID (auto generated)
            </label>
            <input
              type="text"
              value={advertId}
              readOnly
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] cursor-not-allowed opacity-70"
            />
          </div>

          {/* Message (Client) */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Message (Client)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
              placeholder="Enter message for clients"
            />
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
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={advertFormat === "Image"}
                  readOnly
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span>{advertFormat}</span>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
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
                    <span>{format}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Advert Image Upload */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Advert Image
            </label>
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
                onChange={handleFileInput}
                className="hidden"
              />
              <IoCloudUploadOutline className="w-12 h-12 text-[#b5b5b5] mx-auto mb-3" />
              <p className="text-[#b5b5b5] text-sm mb-1">
                Drag & Drop your image here or
              </p>
              <p className="text-[#b1f128] text-sm font-medium">Upload File</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


