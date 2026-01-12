"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import GenerateReferralModal from "@/components/referrals/generate-referral-modal";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";

export default function ReferralCodePage() {
  const params = useParams();
  const router = useRouter();
  const referralCode = params?.code as string;
  
  const wallet = useWallet();
  const walletAddress = wallet.address;
  const isConnected = wallet.isConnected;
  
  const {
    isModalOpen: isWalletModalOpen,
    openModal: openWalletModal,
    closeModal: closeWalletModal,
    connectWallet,
    openExplorer,
  } = useWalletConnection();
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAppliedCode, setHasAppliedCode] = useState(false);

  // Validate referral code on mount
  useEffect(() => {
    if (!referralCode) {
      setError("Invalid referral link");
      setIsValidating(false);
      return;
    }

    const validateCode = async () => {
      try {
        // Check if code exists in database
        const response = await fetch(
          `/api/v1/referrals?walletAddress=check&action=validate&code=${encodeURIComponent(referralCode)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsValidCode(data.valid || false);
          if (!data.valid) {
            setError("Invalid or expired referral code");
          }
        } else {
          setError("Failed to validate referral code");
          setIsValidCode(false);
        }
      } catch (err) {
        console.error("Error validating referral code:", err);
        setError("Failed to validate referral code");
        setIsValidCode(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateCode();
  }, [referralCode]);

  // Handle wallet connection and apply referral code
  useEffect(() => {
    if (!isValidCode || isValidating) return;
    
    // If wallet is connected, apply the referral code
    if (isConnected && walletAddress && !hasAppliedCode) {
      applyReferralCode();
    }
    // If wallet is not connected, open wallet modal
    else if (!isConnected && !isWalletModalOpen && !hasAppliedCode) {
      openWalletModal();
    }
  }, [isConnected, walletAddress, isValidCode, isValidating, hasAppliedCode, isWalletModalOpen]);

  // Listen for wallet connection
  useEffect(() => {
    if (isConnected && walletAddress && isValidCode && !hasAppliedCode) {
      // Small delay to ensure wallet is fully connected
      const timer = setTimeout(() => {
        applyReferralCode();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, walletAddress, isValidCode, hasAppliedCode]);

  const applyReferralCode = async () => {
    if (!walletAddress || !referralCode || hasAppliedCode) return;

    try {
      const response = await fetch("/api/v1/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "apply",
          walletAddress,
          referralCode: referralCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to apply referral code");
        // Still open modal even if already referred
        if (data.message?.includes("already been referred")) {
          setIsGenerateModalOpen(true);
        }
        return;
      }

      // Successfully applied
      setHasAppliedCode(true);
      setError(null);
      
      // Open generate referral modal
      setIsGenerateModalOpen(true);
      
      // Redirect to referrals page after a short delay
      setTimeout(() => {
        router.push("/referrals");
      }, 2000);
    } catch (err: any) {
      console.error("Error applying referral code:", err);
      setError(err.message || "Failed to apply referral code");
    }
  };

  const handleCodeGenerated = () => {
    setIsGenerateModalOpen(false);
    router.push("/referrals");
  };

  const handleWalletConnect = async (type: any) => {
    try {
      await connectWallet(type);
      // Modal will close automatically after connection
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#010501]">
        <div className="text-center">
          <p className="font-manrope text-[#B5B5B5] text-lg">Validating referral code...</p>
        </div>
      </div>
    );
  }

  if (!isValidCode || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#010501]">
        <div className="text-center max-w-md px-4">
          <h1 className="font-manrope text-white text-2xl mb-4">Invalid Referral Code</h1>
          <p className="font-manrope text-[#B5B5B5] mb-6">{error || "This referral code is invalid or has expired."}</p>
          <button
            onClick={() => router.push("/referrals")}
            className="bg-[#B1F128] text-[#010501] rounded-lg py-3 px-6 font-manrope font-semibold hover:bg-[#B1F128]/90 transition"
          >
            Go to Referrals
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConnectWalletModal
        open={isWalletModalOpen}
        onOpenChange={closeWalletModal}
        onWalletConnect={handleWalletConnect}
        onOpenExplorer={openExplorer}
      />
      
      <GenerateReferralModal
        open={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
        walletAddress={walletAddress || ""}
        onCodeGenerated={handleCodeGenerated}
      />

      <div className="flex items-center justify-center min-h-screen bg-[#010501]">
        <div className="text-center max-w-md px-4">
          {!isConnected ? (
            <>
              <h1 className="font-manrope text-white text-2xl mb-4">Connect Your Wallet</h1>
              <p className="font-manrope text-[#B5B5B5] mb-6">
                Connect your wallet to apply referral code <span className="text-[#B1F128] font-semibold">{referralCode}</span>
              </p>
              <p className="font-manrope text-[#7C7C7C] text-sm mb-4">Opening wallet connection...</p>
            </>
          ) : hasAppliedCode ? (
            <>
              <h1 className="font-manrope text-white text-2xl mb-4">Referral Code Applied!</h1>
              <p className="font-manrope text-[#B5B5B5] mb-6">
                Successfully applied referral code <span className="text-[#B1F128] font-semibold">{referralCode}</span>
              </p>
              <p className="font-manrope text-[#7C7C7C] text-sm">Redirecting to referrals page...</p>
            </>
          ) : (
            <>
              <h1 className="font-manrope text-white text-2xl mb-4">Applying Referral Code</h1>
              <p className="font-manrope text-[#B5B5B5] mb-6">
                Applying referral code <span className="text-[#B1F128] font-semibold">{referralCode}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

