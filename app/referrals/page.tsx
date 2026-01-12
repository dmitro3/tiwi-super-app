"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import InviteBanner from "@/components/inviteBanner";
import { FiCopy, FiCheck } from "react-icons/fi";
import { FaShareFromSquare } from "react-icons/fa6";
import { LuArrowRightToLine } from "react-icons/lu";
import ReferralLeaderboard from "@/components/referralLeadeboard";
import FaqsComponent from "@/components/faqs";
import GenerateReferralModal from "@/components/referrals/generate-referral-modal";
import ShareReferralModal from "@/components/referrals/share-referral-modal";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { formatAddress } from "@/lib/shared/utils/formatting";
import { QRCodeSVG } from "qrcode.react";

interface ReferralStats {
  totalInvites: number;
  totalBonuses: number;
  claimableRewards: number;
  referralCode: string | null;
  referralLink: string | null;
}

interface RecentActivity {
  walletAddress: string;
  reward: number;
  timestamp: string;
}

export default function Referrals() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [copiedReferralLink, setCopiedReferralLink] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    totalInvites: 0,
    totalBonuses: 0,
    claimableRewards: 0,
    referralCode: null,
    referralLink: null,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const wallet = useWallet();
  const walletAddress = wallet.address || "";

  // Format wallet address for display
  const formatWalletDisplay = (addr: string): string => {
    if (!addr) return "0x09....879";
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const userWalletAddress = formatWalletDisplay(walletAddress);

  const referralRules = [
    "When someone signs up using your referral link or code, they become your referee permanently.",
    "You earn a percentage of the TIWI Protocol fee (0.25%) from their spot trades only",
    "Rebates are paid in USDT, not in TIWI tokens.",
    "Your earnings depend on your Referral Level, which is based on how much your referees traded in the past 28 days.",
    "You only earn from spot trading volume made by people you referred.",
    "Fees are automatically converted to USDT and stored for monthly payout.",
    "Your rebate rate increases as your referees generate more trading volume.",
    "Rebate earnings update continuously throughout the month.",
    "The claim window opens every 28th of the month.",
    "You can claim your USDT directly to your wallet once claims are enabled.",
  ];

  // Fetch referral data on mount and when wallet changes (silently in background)
  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    const fetchReferralData = async () => {
      try {
        // Fetch stats silently
        const statsResponse = await fetch(
          `/api/v1/referrals?walletAddress=${walletAddress}&action=stats`
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
          setHasReferralCode(!!statsData.stats.referralCode);
        }

        // Fetch recent activity silently
        const activityResponse = await fetch(
          `/api/v1/referrals?walletAddress=${walletAddress}&action=activity&limit=5`
        );
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setRecentActivity(activityData.activity || []);
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
        // Silently fail - don't disrupt UI
      }
    };

    // Initial fetch
    fetchReferralData();
    
    // Poll for activity updates every 30 seconds (silently)
    const interval = setInterval(fetchReferralData, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleCopy = async () => {
    if (!inputRef.current) return;

    await navigator.clipboard.writeText(inputRef.current.value);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  const handleGenerate = () => {
    setIsModalOpen(true);
  };

  const handleCodeGenerated = async (code: string, link: string) => {
    // Update stats immediately with the new code
    setStats(prev => ({
      ...prev,
      referralCode: code,
      referralLink: link,
    }));
    
    // Set hasReferralCode to true to show dashboard view
    setHasReferralCode(true);
    setIsModalOpen(false);
    
    // Refresh stats from database to get latest data
    if (walletAddress) {
      const response = await fetch(
        `/api/v1/referrals?walletAddress=${walletAddress}&action=stats`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        // Ensure hasReferralCode is set to true after refresh
        if (data.stats.referralCode) {
          setHasReferralCode(true);
        }
      }
    }
    
    // Refresh activity to show latest updates
    if (walletAddress) {
      const activityResponse = await fetch(
        `/api/v1/referrals?walletAddress=${walletAddress}&action=activity&limit=5`
      );
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activity || []);
      }
    }
  };

  const handleApplyReferralCode = async () => {
    if (!inputRef.current?.value || !walletAddress) return;
    
    setIsApplyingCode(true);
    setApplyError(null);
    setApplySuccess(false);
    
    try {
      const response = await fetch("/api/v1/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "apply",
          walletAddress,
          referralCode: inputRef.current.value.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to apply referral code");
      }
      
      // Successfully applied referral code
      setApplySuccess(true);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      
      // Refresh stats to update referral counts
      const statsResponse = await fetch(
        `/api/v1/referrals?walletAddress=${walletAddress}&action=stats`
      );
      let userHasCode = false;
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
        userHasCode = !!statsData.stats.referralCode;
        // Update hasReferralCode state if user now has a code
        if (userHasCode) {
          setHasReferralCode(true);
        }
      }
      
      // Refresh activity
      const activityResponse = await fetch(
        `/api/v1/referrals?walletAddress=${walletAddress}&action=activity&limit=5`
      );
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activity || []);
      }
      
      // Open the generate referral modal for the new user to create their own code
      // Only if they don't already have a referral code
      if (!userHasCode) {
        // Small delay to show success message first
        setTimeout(() => {
          setIsModalOpen(true);
        }, 1000);
      }
      
    } catch (error: any) {
      setApplyError(error.message || "Failed to apply referral code");
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (stats.referralCode) {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopiedReferralCode(true);
      setTimeout(() => setCopiedReferralCode(false), 1500);
    }
  };

  const handleCopyReferralLink = async () => {
    if (stats.referralLink) {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopiedReferralLink(true);
      setTimeout(() => setCopiedReferralLink(false), 1500);
    }
  };

  // Get most recent activity for display
  const getRecentActivityDisplay = () => {
    if (recentActivity.length === 0) {
      return { wallet: "0x09....879", reward: 20.61 };
    }
    const mostRecent = recentActivity[0];
    return {
      wallet: formatWalletDisplay(mostRecent.walletAddress),
      reward: mostRecent.reward,
    };
  };

  const recentActivityDisplay = getRecentActivityDisplay();

  // First page - No referral code yet
  if (!hasReferralCode) {
    return (
      <>
        <GenerateReferralModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          walletAddress={walletAddress}
          onCodeGenerated={handleCodeGenerated}
        />
        <section className="mt-4 md:mt-12 py-4">
          <InviteBanner />

          {/* referral rules div */}
          <div className="flex flex-col md:flex-row w-full md:gap-2 md:max-w-225 mx-auto">
            {/* referral code input */}
            <div className="bg-[#010501] mt-5 py-3 px-4 rounded-md">
              <div className="relative mt-4 flex justify-between items-center px-4 py-3 rounded-2xl bg-[#0b0f0e] border border-white/5 overflow-hidden md:w-110">
                <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />

                <span className="relative z-10">
                  <p className="font-manrope font-medium text-xs md:text-sm text-white/90">
                    {recentActivityDisplay.wallet} has recently invited...
                  </p>
                  <p className="font-manrope font-semibold text-sm md:text-base text-[#B1F128]">
                    {recentActivityDisplay.reward.toFixed(2)} USDT
                  </p>
                </span>

                <button className="relative z-10 flex items-center gap-1 font-manrope font-medium text-xs md:text-sm text-[#B5B5B5]">
                  Position <LuArrowRightToLine size={12} />
                </button>
              </div>

              <div className="mt-2 md:mt-4">
                <p className="font-manrope text-[#B5B5B5] font-normal text-xs md:text-sm mb-2">
                  Enter Referral Code (Optional)
                </p>
                <span className="flex justify-between items-center gap-2 mb-3">
                  <div className="relative w-full">
                    <input
                      ref={inputRef}
                      className="bg-[#0B0F0A] w-full p-4 pr-12 text-[#7C7C7C] placeholder:text-[#7C7C7C] outline-0 ring-0 focus:outline-none focus:ring-0 border border-white/5 focus:border-[#B1F128] transition rounded-xl"
                      placeholder="Enter Referral Code"
                      disabled={isApplyingCode}
                    />
                    {/* copy icon */}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B1F128] cursor-pointer"
                    >
                      {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleApplyReferralCode}
                    disabled={isApplyingCode || !walletAddress}
                    className="bg-[#0D3600] p-4 md:px-8 border-[1.5px] border-[#156200] rounded-full text-[#498F00] font-manrope text-sm cursor-pointer hover:bg-[#0D3600]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplyingCode ? "Confirming..." : "Confirm"}
                  </button>
                </span>

                {applyError && (
                  <div className="mb-3 bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2">
                    <p className="text-red-400 text-xs font-manrope">{applyError}</p>
                  </div>
                )}

                {applySuccess && (
                  <div className="mb-3 bg-green-500/10 border border-green-500/50 rounded-lg px-4 py-2">
                    <p className="text-green-400 text-xs font-manrope">
                      Referral code applied successfully!
                    </p>
                  </div>
                )}

                {/* Separator to show Generate button is independent */}
                <div className="my-4 flex items-center gap-2">
                  <div className="flex-1 h-[0.5px] bg-white/5"></div>
                  <span className="text-[#7C7C7C] text-xs font-manrope">OR</span>
                  <div className="flex-1 h-[0.5px] bg-white/5"></div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!walletAddress}
                  className="border-[1.5px] border-[#B1F128] text-[#B1F128] rounded-full py-2 w-full font-medium font-manrope text-sm md:text-base cursor-pointer hover:bg-[#B1F128]/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Generate Referral Code
                </button>
              </div>
            </div>

            {/* referral rules */}
            <div className="bg-[#010501] mt-3 md:mt-5 pb-4 md:pb-0 px-4 rounded-xl">
              <h2 className="font-manrope font-semibold text-sm md:text-base mb-3 md:mb-0">
                Referral rules
              </h2>

              <div className="bg-[#151313] md:bg-transparent py-2 px-2 rounded-xl">
                <ol className="space-y-2 md:space-y-4 mt-2 md:mb-4">
                  {referralRules.map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-start text-xs md:text-sm font-manrope font-medium"
                    >
                      <span className="shrink-0 mr-2">{index + 1}.</span>
                      <span className="">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Second page - Has referral code
  return (
    <>
      <GenerateReferralModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        walletAddress={walletAddress}
        onCodeGenerated={handleCodeGenerated}
      />
      
      <ShareReferralModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        referralLink={stats.referralLink || ""}
        referralCode={stats.referralCode || ""}
      />
      
      <section className="mt-4 md:mt-12 py-4">
        {/* Invite friends banner */}
        <InviteBanner />

        {/* referral rules div */}
        <div className="flex flex-col md:flex-row md:items-start w-full md:gap-2 md:max-w-225 mx-auto">
          <div className="mb-4 md:mb-0">
            {/* referral code input */}
            <div className="bg-[#010501] mt-5 py-3 px-4 rounded-xl">
              <div className="relative mt-4 flex justify-between items-center px-4 py-3 rounded-2xl bg-[#0b0f0e] border border-white/5 overflow-hidden md:w-110">
                <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />

                <span className="relative z-10">
                  <p className="font-manrope font-medium text-xs md:text-sm text-white/90">
                    {recentActivityDisplay.wallet} has recently invited...
                  </p>
                  <p className="font-manrope font-semibold text-sm md:text-base text-[#B1F128]">
                    {recentActivityDisplay.reward.toFixed(2)} USDT
                  </p>
                </span>

                <button className="relative z-10 flex items-center gap-1 font-manrope font-medium text-xs md:text-sm text-[#B5B5B5]">
                  Position <LuArrowRightToLine size={12} />
                </button>
              </div>

              <div className="mt-2 md:mt-4">
                <p className="font-manrope text-[#B5B5B5] font-normal text-xs md:text-sm mb-2">
                  How To Invite
                </p>

                <div className="relative bg-[#0B0F0A] px-4 py-3 rounded-2xl border border-white/5 overflow-hidden md:w-110 flex justify-between items-center mb-3 md:px-4">
                  <div className="pointer-events-none absolute inset-x-4 bottom-px h-px rounded-full bg-[linear-gradient(to_right,rgba(177,241,40,0),rgba(177,241,40,0.95),rgba(177,241,40,0))]" />

                  <div className="flex flex-col items-center">
                    <Image src="/group.svg" width={30} height={30} alt="" />
                    <p className="font-manrope font-medium mt-1 text-center text-xs md:text-sm">
                      Share <br />
                      your link
                    </p>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-linear-to-r from-[#B1F128] via-[#00C65F] via-56% to-[#009288]" />

                  <div className="flex flex-col items-center">
                    <Image src="/checkmark.svg" width={30} height={30} alt="" />
                    <p className="font-manrope font-medium mt-1 text-center text-xs md:text-sm">
                      Friend <br />
                      Sign Up
                    </p>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-linear-to-r from-[#B1F128] via-[#00C65F] via-56% to-[#009288]" />

                  <div className="flex flex-col items-center">
                    <Image src="/dollar.svg" width={30} height={30} alt="" />
                    <p className="font-manrope font-medium mt-1 text-center text-xs md:text-sm">
                      Earn <br />
                      Together
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-manrope text-[#B5B5B5] font-normal text-xs md:text-sm mb-2">
                    My Referrals
                  </p>

                  <div className="flex items-stretch w-full gap-1">
                    {/* Left side - Two stacked cards */}
                    <div className="flex flex-col w-1/2 gap-1">
                      <div className="bg-[#121712] rounded-2xl py-2 px-4 flex-1">
                        <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-1">
                          Total Invites
                        </p>
                        <p className="font-manrope font-semibold text-sm md:text-base text-white">
                          {stats.totalInvites}
                        </p>
                      </div>
                      <div className="bg-[#121712] rounded-2xl py-2 px-4 flex-1">
                        <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-1">
                          Total Bonuses (USDT)
                        </p>
                        <p className="font-manrope font-semibold text-sm md:text-base text-white">
                          {Number(stats.totalBonuses).toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Single tall card */}
                    <div className="flex flex-col justify-between bg-[#121712] rounded-2xl p-4 w-1/2">
                      <div>
                        <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-1">
                          Claimable Rewards
                        </p>
                        <p className="font-manrope font-semibold text-sm md:text-base text-white">
                          ${Number(stats.claimableRewards).toFixed(2)}
                        </p>
                      </div>

                      <span>
                        <button
                          onClick={handleGenerate}
                          className="bg-[#0D3600] px-8 py-2 border-[1.5px] border-[#156200] rounded-full text-[#498F00] font-manrope text-sm cursor-pointer hover:bg-[#0D3600]/80 transition mt-4"
                        >
                          Claim
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {/* Referral Code */}
                    {stats.referralCode && (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-2">
                            My Referral Code
                          </p>
                          <div className="relative">
                            <div className="pr-7">
                              <p className="font-manrope font-semibold text-xs md:text-sm text-white">
                                {stats.referralCode}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyReferralCode}
                              className="absolute right-0 top-1/2 -translate-y-1/2 text-[#B1F128] cursor-pointer hover:text-[#B1F128]/80 transition"
                            >
                              {copiedReferralCode ? (
                                <FiCheck size={18} />
                              ) : (
                                <FiCopy size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Gradient Divider */}
                        <div className="h-[0.5px] w-full bg-[#B5B5B5] my-2"></div>
                      </>
                    )}

                    {/* Referral Link */}
                    {stats.referralLink && (
                      <div className="mb-4 flex justify-between items-center">
                        <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-2">
                          My Referral Link
                        </p>
                        <div className="relative">
                          <div className="pr-7 overflow-hidden flex justify-end">
                            <p className="font-manrope font-semibold text-xs md:text-sm text-white truncate max-w-28 md:max-w-32">
                              {stats.referralLink}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyReferralLink}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-[#B1F128] cursor-pointer hover:text-[#B1F128]/80 transition"
                          >
                            {copiedReferralLink ? (
                              <FiCheck size={18} />
                            ) : (
                              <FiCopy size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* QR code component */}
            <div className="px-2 md:px-0">
              <div className="mt-2 md:mt-4 py-3 rounded-xl bg-[#010501] w-full">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    disabled={!stats.referralLink}
                    className="bg-[#B1F128] cursor-pointer font-manrope font-semibold text-xs md:text-sm text-[#010501] rounded-full py-2 px-4 flex gap-2 items-center hover:bg-[#B1F128]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaShareFromSquare />
                    Invite Friend
                  </button>

                  {stats.referralLink && (
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG
                        value={stats.referralLink}
                        size={60}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* referral leaderboard and rebate levels */}
          <div className="px-2 md:px-0">
            <div className="bg-[#010501] rounded-xl w-full">
              <ReferralLeaderboard />
            </div>
          </div>
        </div>

        {/* FAQS */}
        <div className="px-2 md:px-0">
          <div className="mt-4 md:mt-8 w-full md:max-w-225 mx-auto">
            <FaqsComponent />
          </div>
        </div>
      </section>
    </>
  );
}


