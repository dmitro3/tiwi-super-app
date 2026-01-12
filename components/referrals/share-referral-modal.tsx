"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiCopy, FiCheck, FiDownload } from "react-icons/fi";
import { FaFacebook, FaWhatsapp, FaTelegram, FaXTwitter } from "react-icons/fa6";
import { QRCodeSVG } from "qrcode.react";

interface ShareReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralLink: string;
  referralCode: string;
}

export default function ShareReferralModal({
  open,
  onOpenChange,
  referralLink,
  referralCode,
}: ShareReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const shareMessage = `🚀 Join me on TIWI Protocol and earn rewards together! Use my referral code: ${referralCode}\n\n${referralLink}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedLink = encodeURIComponent(referralLink);

    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedMessage}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedMessage}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(`🚀 Join me on TIWI Protocol and earn rewards! Use my referral code: ${referralCode}`)}`;
        break;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('referral-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 400;
    canvas.height = 400;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `tiwi-referral-${referralCode}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleCopyQR = async () => {
    try {
      const svg = document.getElementById('referral-qr-code');
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 400;
      canvas.height = 400;
      
      img.onload = async () => {
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              setQrCopied(true);
              setTimeout(() => setQrCopied(false), 2000);
            } catch (err) {
              // Fallback: download if clipboard API fails
              handleDownloadQR();
            }
          }
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (err) {
      console.error('Failed to copy QR code:', err);
    }
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: FaFacebook,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10 hover:bg-blue-600/20",
      onClick: () => handleShare("facebook"),
    },
    {
      name: "WhatsApp",
      icon: FaWhatsapp,
      color: "text-green-500",
      bgColor: "bg-green-500/10 hover:bg-green-500/20",
      onClick: () => handleShare("whatsapp"),
    },
    {
      name: "X (Twitter)",
      icon: FaXTwitter,
      color: "text-black dark:text-white",
      bgColor: "bg-gray-500/10 hover:bg-gray-500/20",
      onClick: () => handleShare("twitter"),
    },
    {
      name: "Telegram",
      icon: FaTelegram,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10 hover:bg-blue-400/20",
      onClick: () => handleShare("telegram"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#010501] border-white/5 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-manrope text-xl text-white">
            Share Referral Link
          </DialogTitle>
          <DialogDescription className="font-manrope text-sm text-[#B5B5B5]">
            Invite friends and earn rewards together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* QR Code Section */}
          {referralLink && (
            <div className="bg-[#0B0F0A] border border-white/5 rounded-lg p-4 flex flex-col items-center gap-3">
              <label className="block font-manrope text-xs text-[#B5B5B5]">
                Scan QR Code
              </label>
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  id="referral-qr-code"
                  value={referralLink}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 bg-[#010501] border border-white/5 rounded-lg py-2 px-4 font-manrope text-sm text-white hover:bg-white/5 transition flex items-center justify-center gap-2"
                >
                  <FiDownload size={16} />
                  Download
                </button>
                <button
                  onClick={handleCopyQR}
                  className="flex-1 bg-[#010501] border border-white/5 rounded-lg py-2 px-4 font-manrope text-sm text-white hover:bg-white/5 transition flex items-center justify-center gap-2"
                >
                  {qrCopied ? (
                    <>
                      <FiCheck size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy size={16} />
                      Copy QR
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Referral Link Display */}
          <div className="bg-[#0B0F0A] border border-white/5 rounded-lg p-4">
            <label className="block font-manrope text-xs text-[#B5B5B5] mb-2">
              Your Referral Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#010501] border border-white/5 rounded-lg px-4 py-2 overflow-hidden">
                <p className="font-manrope text-xs text-white truncate">
                  {referralLink}
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
            {copied && (
              <p className="text-xs text-[#B1F128] font-manrope mt-2">
                Link copied to clipboard!
              </p>
            )}
          </div>

          {/* Share Options */}
          <div>
            <label className="block font-manrope text-sm text-[#B5B5B5] mb-3">
              Share via
            </label>
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={option.onClick}
                    className={`${option.bgColor} border border-white/5 rounded-lg p-4 flex flex-col items-center gap-2 transition cursor-pointer`}
                  >
                    <Icon className={`${option.color} text-2xl`} />
                    <span className="font-manrope text-sm text-white">
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopy}
            className="w-full bg-[#B1F128] text-[#010501] rounded-lg py-3 px-4 font-manrope font-semibold text-sm hover:bg-[#B1F128]/90 transition flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <FiCheck size={18} />
                Link Copied!
              </>
            ) : (
              <>
                <FiCopy size={18} />
                Copy Link
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

