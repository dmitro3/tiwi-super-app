"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { IoWaterOutline, IoTimeOutline } from "react-icons/io5";

export default function LiquidityPoolsComingSoonPage() {
  return (
    <AdminLayout pageTitle="Admin - Liquidity Pools" activeNavItem="liquidity-pools">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center max-w-md mx-auto px-4">
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#081f02] border border-[#b1f128] rounded-full mb-6">
              <IoTimeOutline className="w-5 h-5 text-[#b1f128]" />
              <span className="text-[#b1f128] font-medium text-sm">Coming Soon</span>
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-[#121712] border-2 border-[#1f261e] rounded-full flex items-center justify-center">
                <IoWaterOutline className="w-12 h-12 text-[#b1f128]" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-semibold text-white mb-4">
              Liquidity Pools
            </h1>

            {/* Description */}
            <p className="text-[#b5b5b5] text-base lg:text-lg mb-8">
              We're working hard to bring you an amazing liquidity pools management experience. This feature will be available soon!
            </p>

            {/* Additional Info Card */}
            <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-6">
              <h2 className="text-white font-medium text-lg mb-3">What to expect:</h2>
              <ul className="text-left space-y-2 text-[#b5b5b5] text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#b1f128] mt-1">•</span>
                  <span>Create and manage liquidity pools</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#b1f128] mt-1">•</span>
                  <span>Monitor pool performance and metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#b1f128] mt-1">•</span>
                  <span>Configure pool parameters and settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#b1f128] mt-1">•</span>
                  <span>Track liquidity and trading volume</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}


