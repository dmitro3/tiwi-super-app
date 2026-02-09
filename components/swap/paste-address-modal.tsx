"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Wallet } from "lucide-react";
import { truncateAddress, isAddressChainCompatible } from "@/lib/frontend/utils/wallet-display";

interface PasteAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: string) => void;
  chainId?: number;
}

const RECENT_ADDRESSES_KEY = "tiwi_recent_recipient_addresses";
const MAX_RECENT_ADDRESSES = 10;

export default function PasteAddressModal({
  open,
  onOpenChange,
  onSave,
  chainId,
}: PasteAddressModalProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);

  // Load recent addresses from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && open) {
      try {
        const stored = localStorage.getItem(RECENT_ADDRESSES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setRecentAddresses(parsed.filter((addr) => addr && addr.trim() !== ""));
        }
      } catch (error) {
        console.error("[PasteAddressModal] Error loading recent addresses:", error);
      }
    }
  }, [open]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setAddress("");
      setError(null);
    }
  }, [open]);

  // Validate address format
  const isValidAddress = (addr: string): boolean => {
    if (!addr || !addr.trim()) return false;
    const trimmed = addr.trim();

    // EVM: 0x + 40 hex chars
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      return true;
    }

    // Solana: base58, 32-44 chars, no 0x
    if (!trimmed.startsWith("0x") && trimmed.length >= 32 && trimmed.length <= 44) {
      return true;
    }

    return false;
  };

  // Validate address against chain
  const validateAddress = (addr: string): boolean => {
    if (!chainId) return isValidAddress(addr);
    return isValidAddress(addr) && isAddressChainCompatible(addr, chainId);
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setError(null);

    if (value.trim() && !isValidAddress(value.trim())) {
      setError(
        chainId === 7565164
          ? "Invalid Solana address (32-44 characters)"
          : "Invalid EVM address (0x followed by 40 hex characters)"
      );
    } else if (value.trim() && chainId && !isAddressChainCompatible(value.trim(), chainId)) {
      setError("Address is not compatible with the selected token's chain");
    }
  };

  const saveRecentAddress = (addr: string) => {
    if (typeof window === "undefined") return;

    try {
      const trimmed = addr.trim();
      // Store the original case address for display, but use lowercase for deduplication
      const current = recentAddresses.map((a) => a.toLowerCase());
      const filtered = current.filter((a) => a !== trimmed.toLowerCase());
      // Store original case address (not lowercase) so we can display it properly
      const updated = [trimmed, ...recentAddresses.filter((a) => a.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_ADDRESSES);
      setRecentAddresses(updated);
      localStorage.setItem(RECENT_ADDRESSES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("[PasteAddressModal] Error saving recent address:", error);
    }
  };

  const handleSave = () => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter an address");
      return;
    }

    if (!validateAddress(trimmed)) {
      if (!isValidAddress(trimmed)) {
        setError(
          chainId === 7565164
            ? "Invalid Solana address format"
            : "Invalid EVM address format"
        );
      } else {
        setError("Address is not compatible with the selected token's chain");
      }
      return;
    }

    // Save to recent addresses
    saveRecentAddress(trimmed);

    // Call onSave callback
    onSave(trimmed);
    onOpenChange(false);
  };

  const handleRecentAddressClick = (addr: string) => {
    // Use the full address (not truncated) to update the input
    const fullAddress = addr.trim();

    // Update the input box with the full address immediately
    setAddress(fullAddress);

    // Clear any previous errors
    setError(null);

    // Validate the address format
    if (!isValidAddress(fullAddress)) {
      setError(
        chainId === 7565164
          ? "Invalid Solana address format"
          : "Invalid EVM address format"
      );
      return;
    }

    // Check chain compatibility
    if (chainId && !isAddressChainCompatible(fullAddress, chainId)) {
      setError("This address is not compatible with the selected token's chain");
      return;
    }

    // If valid, auto-save immediately (no need to click Save button)
    saveRecentAddress(fullAddress);
    onSave(fullAddress);
    onOpenChange(false);
  };

  const handleRemoveRecentAddress = (addrToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentAddresses((prev) => {
      const updated = prev.filter((addr) => addr.toLowerCase() !== addrToRemove.toLowerCase());
      localStorage.setItem(RECENT_ADDRESSES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#0b0f0a] border border-[#1f261e] text-white max-w-sm w-[90vw] sm:max-w-sm!"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-lg font-semibold text-white">
            To Address
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-full hover:bg-[#121712] transition-colors border border-[#1f261e] outline-none"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white cursor-pointer" />
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Address Input */}
          <div>
            <Input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="Enter address"
              className={`bg-[#121712] border ${error ? "border-red-500" : "border-[#1f261e]"
                } text-white placeholder-[#7c7c7c] focus:border-[#b1f128] focus:ring-1 focus:ring-[#b1f128] rounded-lg px-4 py-3 text-base h-auto`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !error && address.trim()) {
                  handleSave();
                }
              }}
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-400 font-medium mt-2">{error}</p>
            )}
          </div>

          {/* Recent Addresses Section */}
          {recentAddresses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#b5b5b5] mb-3">Recent addresses</h3>
              <div className="flex flex-wrap gap-2">
                {recentAddresses.map((addr) => {
                  const isCompatible = chainId ? isAddressChainCompatible(addr, chainId) : true;
                  return (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => handleRecentAddressClick(addr)}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${isCompatible
                          ? "bg-[#121712] border-[#1f261e] hover:bg-[#1f261e] hover:border-[#b1f128]/30"
                          : "bg-[#121712] border-[#1f261e] opacity-70 hover:opacity-90"
                        }`}
                    >
                      <Wallet className="w-4 h-4 text-[#7c7c7c] shrink-0" />
                      <span className="text-sm text-white font-medium">
                        {truncateAddress(addr)}
                      </span>
                      {isCompatible && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecentAddress(addr, e)}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove address"
                        >
                          <X className="w-3 h-3 text-[#7c7c7c] hover:text-white" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!!error || !address.trim()}
            className="w-full bg-[#b1f128] hover:bg-[#9dd81f] text-[#010501] font-semibold py-3 h-auto text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

