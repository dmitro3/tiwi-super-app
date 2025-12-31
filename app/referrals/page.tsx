"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import InviteBanner from "@/components/inviteBanner";
import { FiCopy, FiCheck } from "react-icons/fi";
import { FaShareFromSquare } from "react-icons/fa6";
import { LuArrowRightToLine } from "react-icons/lu";
import ReferralLeaderboard from "@/components/referralLeadeboard";
import FaqsComponent from "@/components/faqs";

export default function Referrals() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [copiedReferralLink, setCopiedReferralLink] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);

  const userWalletAddress = "0x09....879";
  const reward = 20.61;
  const totalInvites = 0;
  const totalBonuses = 0;
  const claimableRewards = 0;
  const referralCode = "TIWI91034";
  const referralLink = "https://tiwiprotocol.com/referral/TIWI91024";

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

  // Check if referral code exists on mount
  useEffect(() => {
    const stored = localStorage.getItem("hasReferralCode");
    if (stored === "true") {
      setHasReferralCode(true);
    }
  }, []);

  const handleCopy = async () => {
    if (!inputRef.current) return;

    await navigator.clipboard.writeText(inputRef.current.value);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  const handleGenerate = async () => {
    // Store in localStorage to persist across page reloads
    localStorage.setItem("hasReferralCode", "true");
    setHasReferralCode(true);
  };

  const handleCopyReferralCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopiedReferralCode(true);
    setTimeout(() => setCopiedReferralCode(false), 1500);
  };

  const handleCopyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedReferralLink(true);
    setTimeout(() => setCopiedReferralLink(false), 1500);
  };

  // First page - No referral code yet
  if (!hasReferralCode) {
    return (
      <>
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
                    {userWalletAddress} has recently invited...
                  </p>
                  <p className="font-manrope font-semibold text-sm md:text-base text-[#B1F128]">
                    {reward} USDT
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
                  <button className="bg-[#0D3600] p-4 md:px-8 border-[1.5px] border-[#156200] rounded-full text-[#498F00] font-manrope text-sm cursor-pointer">
                    Confirm
                  </button>
                </span>

                <button
                  onClick={handleGenerate}
                  className="border-[1.5px] border-[#B1F128] text-[#B1F128] rounded-full py-2 w-full font-medium font-manrope text-sm md:text-base cursor-pointer"
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
                    {userWalletAddress} has recently invited...
                  </p>
                  <p className="font-manrope font-semibold text-sm md:text-base text-[#B1F128]">
                    {reward} USDT
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
                          {totalInvites}
                        </p>
                      </div>
                      <div className="bg-[#121712] rounded-2xl py-2 px-4 flex-1">
                        <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-1">
                          Total Bonuses (USDT)
                        </p>
                        <p className="font-manrope font-semibold text-sm md:text-base text-white">
                          {Number(totalBonuses).toFixed(4)}
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
                          ${Number(claimableRewards).toFixed(2)}
                        </p>
                      </div>

                      <span>
                        <button className="bg-[#0D3600] px-8 py-2 border-[1.5px] border-[#156200] rounded-full text-[#498F00] font-manrope text-sm cursor-pointer hover:bg-[#0D3600]/80 transition mt-4">
                          Claim
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {/* Referral Code */}
                    <div className="flex justify-between items-center">
                      <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-2">
                        My Referral Code
                      </p>
                      <div className="relative">
                        <div className="pr-7">
                          <p className="font-manrope font-semibold text-xs md:text-sm text-white">
                            {referralCode}
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

                    {/* Referral Link */}
                    <div className="mb-4 flex justify-between items-center">
                      <p className="font-manrope text-[#B5B5B5] font-medium text-xs md:text-sm mb-2">
                        My Referral Link
                      </p>
                      <div className="relative">
                        <div className="pr-7 overflow-hidden flex justify-end">
                          <p className="font-manrope font-semibold text-xs md:text-sm text-white truncate max-w-28 md:max-w-32">
                            {referralLink}
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
                  </div>
                </div>
              </div>
            </div>

            {/* QR code component */}
            <div className="px-2 md:px-0">
              <div className="mt-2 md:mt-4 py-3 rounded-xl bg-[#010501] w-full">
                <div className="flex items-center justify-center">
                  <button className="bg-[#B1F128] cursor-pointer font-manrope font-semibold text-xs md:text-sm text-[#010501] rounded-full py-2 px-4 flex gap-2 items-center">
                    <FaShareFromSquare />
                    Invite Friend
                  </button>

                  <div className="ml-4">
                    <Image
                      src="/qr-code.svg"
                      width={40}
                      height={40}
                      alt="QR Code"
                    />
                  </div>
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

