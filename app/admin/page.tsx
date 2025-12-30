"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { IoArrowUpOutline, IoAlertCircleOutline } from "react-icons/io5";

export default function AdminDashboard() {
  const criticalAlerts = [
    {
      title: "Protocol Performance Degraded",
      description:
        "We've detected a significant drop in protocol performance, impacting user experience. Users may experience delays.",
    },
    {
      title: "Smart Contract Paused",
      description:
        "A critical smart contract has been paused to prevent potential risk.",
    },
    {
      title: "Liquidity Pool Imbalance Detected",
      description:
        "A liquidity pool has exceeded safe thresholds, indicating an imbalance.",
    },
    {
      title: "Unstable Liquidity Drain Detected",
      description:
        "A critical drain has been detected in a liquidity pool.",
    },
    {
      title: "Potential Liquidity Drain Unlocked",
      description:
        "An unusual inflow of liquidity detected in a liquidity pool.",
    },
  ];

  const liveNotifications = [
    {
      message:
        "TMM Protocol change is scheduled to happen in the next 24 hours. This may impact operations during this period.",
      time: "2 mins ago",
    },
    {
      message:
        "New staking opportunities live. Start earning immediately by staking your tokens.",
      time: "28 mins ago",
    },
    {
      message:
        "New staking opportunities live. Start earning immediately by staking your tokens.",
      time: "50 mins ago",
    },
  ];

  return (
    <AdminLayout pageTitle="Admin - Dashboard" activeNavItem="dashboard">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Dashboard Overview */}
          <div className="mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">Dashboard</h2>
            <p className="text-[#b5b5b5] text-xs lg:text-sm">
              Monitor protocol activity, manage alerts, and track assets across
              staking, liquidity, and ad campaigns in real-time.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Total Tokens Locked */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Total Tokens Locked
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="text-xs">1.2%</span>
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-semibold text-white mb-2">4,567</div>
              <p className="text-[#7c7c7c] text-xs">
                increase in the past 2 weeks
              </p>
            </div>

            {/* Active Staking Pools */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Active Staking Pools
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="text-xs">0.7%</span>
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-semibold text-white mb-2">
                $123,456
              </div>
              <p className="text-[#7c7c7c] text-xs">growth this month</p>
            </div>

            {/* Active Liquidity Pools */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Active Liquidity Pools
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="text-xs">1.5%</span>
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-semibold text-white mb-2">890</div>
              <p className="text-[#7c7c7c] text-xs">pools added</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-6">
            {/* Live Notifications */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Live Notifications
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-white mb-2">125</div>
              <p className="text-[#7c7c7c] text-xs">25 new notifications incoming</p>
            </div>

            {/* Active Ad Campaigns */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Active Ad Campaigns
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-white mb-2">12</div>
              <p className="text-[#7c7c7c] text-xs">5 new campaigns running</p>
            </div>

            {/* Protocol Status */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-[#b5b5b5] text-xs lg:text-sm font-medium">
                  Protocol Status
                </h3>
                <div className="flex items-center gap-1 text-[#4ade80]">
                  <IoArrowUpOutline className="w-3 h-3 lg:w-4 lg:h-4" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-white mb-2">5</div>
              <p className="text-[#7c7c7c] text-xs">Active issues</p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Critical Alerts */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-base lg:text-lg">Critical Alerts</h3>
                <button className="text-[#b1f128] text-xs lg:text-sm font-medium hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {criticalAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-3 lg:p-4"
                  >
                    <div className="flex items-start gap-2 lg:gap-3">
                      <IoAlertCircleOutline className="w-4 h-4 lg:w-5 lg:h-5 text-[#ff5c5c] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-xs lg:text-sm mb-1">
                          {alert.title}
                        </h4>
                        <p className="text-[#b5b5b5] text-xs mb-2 lg:mb-3">
                          {alert.description}
                        </p>
                        <button className="text-[#b1f128] text-xs font-medium hover:underline">
                          Review now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Notifications */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-base lg:text-lg">
                  Live Notifications
                </h3>
                <button className="text-[#b1f128] text-xs lg:text-sm font-medium hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {liveNotifications.map((notification, index) => (
                  <div
                    key={index}
                    className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-3 lg:p-4"
                  >
                    <p className="text-[#b5b5b5] text-xs lg:text-sm mb-2">
                      {notification.message}
                    </p>
                    <p className="text-[#7c7c7c] text-xs">{notification.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
    </AdminLayout>
  );
}

