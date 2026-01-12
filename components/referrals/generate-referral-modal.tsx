"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiCopy, FiCheck } from "react-icons/fi";

interface GenerateReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onCodeGenerated?: (code: string, link: string) => void;
}

export default function GenerateReferralModal({
  open,
  onOpenChange,
  walletAddress,
  onCodeGenerated,
}: GenerateReferralModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch("/api/v1/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          walletAddress,
          customCode: useCustomCode && customCode ? customCode : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate referral code");
      }
      
      setGeneratedCode(data.code);
      setGeneratedLink(data.link);
      
      if (onCodeGenerated) {
        onCodeGenerated(data.code, data.link);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate referral code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setUseCustomCode(false);
      setCustomCode("");
      setError(null);
      setGeneratedCode(null);
      setGeneratedLink(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#010501] border-white/5 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-manrope text-xl text-white">
            Generate Referral Code
          </DialogTitle>
          <DialogDescription className="font-manrope text-sm text-[#B5B5B5]">
            Create a unique referral code to invite friends and earn rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!generatedCode ? (
            <>
              {/* Toggle between auto-generate and custom */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setUseCustomCode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-manrope text-sm transition ${
                    !useCustomCode
                      ? "bg-[#B1F128] text-[#010501] font-semibold"
                      : "bg-[#0B0F0A] text-[#B5B5B5] border border-white/5"
                  }`}
                >
                  Auto Generate
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomCode(true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-manrope text-sm transition ${
                    useCustomCode
                      ? "bg-[#B1F128] text-[#010501] font-semibold"
                      : "bg-[#0B0F0A] text-[#B5B5B5] border border-white/5"
                  }`}
                >
                  Custom Code
                </button>
              </div>

              {/* Custom code input */}
              {useCustomCode && (
                <div>
                  <label className="block font-manrope text-sm text-[#B5B5B5] mb-2">
                    Enter Custom Code
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => {
                      setCustomCode(e.target.value);
                      setError(null);
                    }}
                    placeholder="YourName, YourName123, or Your_Name"
                    className="w-full bg-[#0B0F0A] border border-white/5 rounded-lg px-4 py-3 text-white font-manrope text-sm focus:outline-none focus:border-[#B1F128] transition"
                    maxLength={30}
                  />
                  <p className="mt-1 text-xs text-[#7C7C7C] font-manrope">
                    Use your name, name with numbers, or name with symbols (3-30 characters). Auto-generated codes follow TIWI#### format.
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm font-manrope">{error}</p>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (useCustomCode && !customCode.trim())}
                className="w-full bg-[#B1F128] text-[#010501] rounded-lg py-3 px-4 font-manrope font-semibold text-sm hover:bg-[#B1F128]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Generate Referral Code"}
              </button>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="bg-[#0B0F0A] border border-white/5 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block font-manrope text-xs text-[#B5B5B5] mb-1">
                    Your Referral Code
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#010501] border border-white/5 rounded-lg px-4 py-3">
                      <p className="font-manrope font-semibold text-white text-sm">
                        {generatedCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-[#B1F128] cursor-pointer hover:text-[#B1F128]/80 transition p-2"
                    >
                      {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
                    </button>
                  </div>
                </div>

                {generatedLink && (
                  <div>
                    <label className="block font-manrope text-xs text-[#B5B5B5] mb-1">
                      Your Referral Link
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#010501] border border-white/5 rounded-lg px-4 py-3 overflow-hidden">
                        <p className="font-manrope text-xs text-white truncate">
                          {generatedLink}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (generatedLink) {
                            await navigator.clipboard.writeText(generatedLink);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }
                        }}
                        className="text-[#B1F128] cursor-pointer hover:text-[#B1F128]/80 transition p-2"
                      >
                        {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-[#B1F128] text-[#010501] rounded-lg py-3 px-4 font-manrope font-semibold text-sm hover:bg-[#B1F128]/90 transition"
              >
                Done
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

