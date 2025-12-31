"use client";

import { useState } from "react";
import Image from "next/image";
import { GoDotFill } from "react-icons/go";

export default function ReferralLeaderboard() {
  const [activeTab, setActiveTab] = useState<"rebate" | "leaderboard">(
    "leaderboard"
  );

  const myRebateLevel = 1;
  const invitedFrens = 0;
  const frensSpotVol = 0;
  const frensPerpVol = 0;
  const mySpotRebate = 30;
  const myPerpRebate = 0;

  // Rebate Levels Data
  const rebateLevels = [
    { level: "Level 1", volume: "<=$100.0000", rebate: "30%" },
    { level: "Level 2", volume: ">$100.0000", rebate: "35%" },
    {
      level: "Level 3",
      volume: ">$5,000.0000",
      rebate: "40%",
    },
    {
      level: "Level 4",
      volume: ">$10,000.0000",
      rebate: "45%",
    },
    {
      level: "Level 5",
      volume: ">$12,500.0000",
      rebate: "50%",
    },
    {
      level: "Level 6",
      volume: ">$20,500.0000",
      rebate: "80%",
    },
  ];

  // Leaderboard Data
  const leaderboardData = [
    { rank: 1, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 2, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 3, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 4, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 5, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 6, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 7, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 8, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 9, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
    { rank: 10, uid: "0x2345eFghdfRFDS23452", invites: 120, rewards: "$800" },
  ];

  return (
    <>
      <div className="bg-[#010501] rounded-xl p-4 w-full">
        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
          <div className="flex space-x-5 w-fit">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`py-2 rounded-md font-manrope font-medium transition cursor-pointer relative ${
                activeTab === "leaderboard"
                  ? "text-[#B1F128] text-sm md:text-base"
                  : "text-[#B5B5B5] text-sm md:text-base hover:text-white"
              }`}
            >
              Referral Leaderboard
              {activeTab === "leaderboard" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B1F128] rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("rebate")}
              className={`py-2 rounded-md font-manrope font-medium transition cursor-pointer relative ${
                activeTab === "rebate"
                  ? "text-[#B1F128] text-sm md:text-base"
                  : "text-[#B5B5B5] text-sm md:text-base hover:text-white"
              }`}
            >
              Rebate Level
              {activeTab === "rebate" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B1F128] rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "rebate" ? (
          // Rebate Level Tab Content
          <div>
            {/* My Rebate Level Card */}
            <div className="rounded-xl mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-manrope font-medium text-sm text-[#B5B5B5]">
                  My Rebate Level:{" "}
                  <span className="text-white ml-1">{myRebateLevel}</span>
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4 w-full">
                <div className="w-full">
                  <p className="font-manrope text-xs text-[#B5B5B5] mb-1">
                    Invited Frens
                  </p>
                  <p className="font-manrope font-semibold text-sm text-white">
                    {invitedFrens}
                  </p>
                </div>
                <div className="w-full">
                  <p className="font-manrope text-xs text-[#B5B5B5] mb-1">
                    Frens&apos; Spot Vol.
                  </p>
                  <p className="font-manrope font-semibold text-sm text-white">
                    ${frensSpotVol}
                  </p>
                </div>
                <div className="w-full">
                  <p className="font-manrope text-xs text-[#B5B5B5] mb-1">
                    Frens&apos; Perp Vol.
                  </p>
                  <p className="font-manrope font-semibold text-sm text-white">
                    {frensPerpVol}
                  </p>
                </div>
                <div className="w-full">
                  <p className="font-manrope text-xs text-[#B5B5B5] mb-1">
                    My Spot Rebate
                  </p>
                  <p className="font-manrope font-semibold text-sm">
                    {mySpotRebate}%
                  </p>
                </div>
                <div className="w-full">
                  <p className="font-manrope text-xs text-[#B5B5B5] mb-1">
                    My Perp Rebate
                  </p>
                  <p className="font-manrope font-semibold text-sm text-white">
                    {myPerpRebate}
                  </p>
                </div>
              </div>
            </div>

            {/* Levels Table */}
            <div className="bg-[#010501] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="bg-[#1F261E]">
                      <th className="text-center py-3 px-4 font-manrope text-xs text-[#B5B5B5] font-medium">
                        Level
                      </th>
                      <th className="text-center py-3 px-4 font-manrope text-xs text-[#B5B5B5] font-medium">
                        28 day referee spot volume
                      </th>
                      <th className="text-center py-3 px-4 font-manrope text-xs text-[#B5B5B5] font-medium">
                        Rebate share applied to 0.25% fee
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebateLevels.map((item, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-transparent" : "bg-[#1F261E]"
                        }
                      >
                        <td className="py-3 px-4 font-manrope text-sm text-white whitespace-nowrap">
                          <div className="flex items-center relative">
                            {index === 0 && (
                              <GoDotFill
                                className="text-[#B1F128] mr-2 absolute -left-3"
                                size={12}
                              />
                            )}
                            {item.level}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-manrope text-sm text-white text-center">
                          {item.volume}
                        </td>
                        <td className="py-3 px-4 font-manrope text-sm text-white text-center">
                          {item.rebate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          // Leaderboard Tab Content
          <div className="bg-[#010501] rounded-xl w-full overflow-x-auto">
            <table className="w-full min-w-full table-fixed">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 font-manrope text-xs text-[#B5B5B5] font-medium">
                    Rank
                  </th>
                  <th className="w-[50%] py-3 font-manrope text-xs text-[#B5B5B5] font-medium">
                    UID
                  </th>
                  <th className="text-left py-3 font-manrope text-xs text-[#B5B5B5] font-medium">
                    Invites
                  </th>
                  <th className="py-3 font-manrope text-xs text-[#B5B5B5] font-medium text-right">
                    Rewards
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <Image
                            src={
                              index === 0
                                ? "/first-medal.svg"
                                : index === 1
                                ? "/second-medal.svg"
                                : "/third-medal.svg"
                            }
                            alt={`${index + 1}${
                              index === 0 ? "st" : index === 1 ? "nd" : "rd"
                            } Place`}
                            width={index === 0 ? 20 : 16}
                            height={index === 0 ? 20 : 16}
                            className={index === 0 ? "w-6 h-6" : "w-5 h-5"}
                          />
                        ) : (
                          <span className="font-manrope text-sm font-semibold text-white">
                            {item.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center font-manrope text-sm text-white">
                      ****{item.uid.slice(-5)}
                    </td>
                    <td className="py-3 font-manrope text-sm text-white">
                      {item.invites}
                    </td>
                    <td className="py-3 font-manrope text-sm text-[#B1F128] font-semibold text-right">
                      {item.rewards}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

