"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline } from "react-icons/io5";

interface TokenSpotlightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tokens = [
  {
    symbol: "TIWICAT",
    name: "TWC",
    address: "0x8d...T1J2",
    icon: "TWC",
  },
  {
    symbol: "USDT",
    name: "Tether",
    address: "0x8d...T1J2",
    icon: "USDT",
  },
  {
    symbol: "USDC",
    name: "USDC",
    address: "0x8d...T1J2",
    icon: "USDC",
  },
  {
    symbol: "BNB",
    name: "BNB Smart Chain",
    address: "0x8d...T1J2",
    icon: "BNB",
  },
];

const spotlightTypes = [
  "Homepage Banner",
  "CoinPage Highlight",
  "Wallet Recommendation",
];

export default function TokenSpotlightModal({
  open,
  onOpenChange,
}: TokenSpotlightModalProps) {
  const [spotlightTitle, setSpotlightTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [startDate, setStartDate] = useState("08/30/2020");
  const [endDate, setEndDate] = useState("08/30/2020");
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState("Homepage Banner");
  const tokenRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tokenRef.current && !tokenRef.current.contains(event.target as Node)) {
        setShowTokenDropdown(false);
      }
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Token Spotlights
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors"
          >
            Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Spotlight Title */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Spotlight Title
            </label>
            <input
              type="text"
              placeholder="Trending This Week"
              value={spotlightTitle}
              onChange={(e) => setSpotlightTitle(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>

          {/* Select Token Dropdown */}
          <div className="relative" ref={tokenRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Select Token
            </label>
            <button
              onClick={() => {
                setShowTokenDropdown(!showTokenDropdown);
                setShowTypeDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#b1f128] rounded-full flex items-center justify-center text-[#010501] font-semibold text-xs">
                  {selectedToken.icon}
                </div>
                <div className="text-left">
                  <div className="text-white font-medium text-sm">
                    {selectedToken.symbol} ({selectedToken.name} {selectedToken.address})
                  </div>
                </div>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showTokenDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-[#1f261e]">
                  <input
                    type="text"
                    placeholder="Search by tokens or address"
                    className="w-full bg-[#121712] border border-[#1f261e] rounded-lg px-3 py-2 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  />
                </div>
                {tokens.map((token, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-white hover:bg-[#121712] transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-[#b1f128] rounded-full flex items-center justify-center text-[#010501] font-semibold text-xs">
                      {token.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {token.symbol} ({token.name} {token.address})
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              placeholder="short promotional copy"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
            />
          </div>

          {/* Date Pickers - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
          </div>

          {/* Spotlight Type Dropdown */}
          <div className="relative" ref={typeRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Spotlight Type
            </label>
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowTokenDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={selectedType === "Homepage Banner"}
                  readOnly
                  className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span>{selectedType}</span>
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showTypeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                {spotlightTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 px-4 py-2 text-white hover:bg-[#121712] transition-colors cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="spotlightType"
                      checked={selectedType === type}
                      onChange={() => {
                        setSelectedType(type);
                        setShowTypeDropdown(false);
                      }}
                      className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Publish Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              Publish Spotlight
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

