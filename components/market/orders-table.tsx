"use client";

import { useState } from "react";
import Image from "next/image";

type OrdersTab = "Orders" | "Transaction History";

interface OrdersTableProps {
  baseSymbol?: string;
  quoteSymbol?: string;
}

/**
 * Orders Table Component
 * Displays user's orders and transaction history
 */
export default function OrdersTable({ baseSymbol = '', quoteSymbol = 'USDT' }: OrdersTableProps) {
  const orders: any[] = [];
  const [activeTab, setActiveTab] = useState<OrdersTab>("Orders");

  return (
    <div className="flex flex-col gap-10 lg:gap-7 xl:gap-8 2xl:gap-10 items-center px-0 py-4 lg:py-3 xl:py-3.5 2xl:py-4">
      <div className="flex flex-col items-start w-full">
        {/* Tabs */}
        <div className="border-b-[0.5px] border-[#1f261e] flex h-[33px] lg:h-[28px] xl:h-[30px] 2xl:h-[33px] items-start px-10 lg:px-7 xl:px-8 2xl:px-10 py-0">
          <div className="flex gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 items-start">
            <button
              onClick={() => setActiveTab("Orders")}
              className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer"
            >
              <span className={`text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold leading-normal text-center whitespace-nowrap ${activeTab === "Orders" ? "text-white" : "text-[#b5b5b5]"
                }`}>
                Orders ({orders.length})
              </span>
              {activeTab === "Orders" && (
                <div className="h-0 w-full border-t border-[#b1f128]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("Transaction History")}
              className="flex flex-col gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-2 items-center cursor-pointer"
            >
              <span className={`text-base lg:text-xs xl:text-sm 2xl:text-base font-medium leading-normal whitespace-nowrap ${activeTab === "Transaction History" ? "text-white" : "text-[#b5b5b5]"
                }`}>
                Transaction History
              </span>
              {activeTab === "Transaction History" && (
                <div className="h-0 w-full border-t border-[#b1f128]"></div>
              )}
            </button>
          </div>
        </div>

        {/* Table Headers */}
        <div className="border-b-[0.5px] border-[#1f261e] flex items-start justify-between px-10 lg:px-7 xl:px-8 2xl:px-10 py-4 lg:py-3 xl:py-3.5 2xl:py-4 w-full">
          <div className="w-[170px] lg:w-[124px] xl:w-[139px] 2xl:w-[170px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Token
            </span>
          </div>
          <div className="w-[88px] lg:w-[64px] xl:w-[72px] 2xl:w-[88px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Value
            </span>
          </div>
          <div className="w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Quantity
            </span>
          </div>
          <div className="w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Margin
            </span>
          </div>
          <div className="w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Risk
            </span>
          </div>
          <div className="w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
            <span className="text-[#7c7c7c] text-base lg:text-xs xl:text-sm 2xl:text-base font-semibold whitespace-nowrap">
              Last Price
            </span>
          </div>
        </div>
      </div>

      {/* Empty State - Only show when on Orders tab and no orders */}
      {orders.length === 0 && activeTab === "Orders" && (
        <div className="flex flex-col gap-2 items-center justify-center py-16">
          {/* <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#b5b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2V8H20" stroke="#b5b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg> */}
          <span className="size-8">
            <Image
              src="/assets/icons/market/file-empty-01.svg"
              alt="Dropdown"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </span>
          <p className="text-[#b5b5b5] text-base xl:text-sm 2xl:text-base font-medium text-center">
            No Available Data
          </p>
        </div>
      )}

      {/* Orders List (when data exists) */}
      {orders.length > 0 && activeTab === "Orders" && (
        <div className="w-full">
          {orders.map((order, index) => {
            const [baseToken, quoteToken] = order.token.split("/");
            return (
              <div
                key={index}
                className="flex items-center justify-between px-10 lg:px-7 xl:px-8 2xl:px-10 py-0 relative w-full"
              >
                {/* Token Column with Green Bar and Icon */}
                <div className="flex gap-2.5 lg:gap-2 xl:gap-2.5 2xl:gap-2.5 items-center w-[170px] lg:w-[124px] xl:w-[139px] 2xl:w-[170px]">
                  {/* Green Bar */}
                  <div className="bg-[#b1f128] h-[76px] lg:h-[55px] xl:h-[62px] 2xl:h-[76px] shrink-0 w-1 lg:w-0.5 xl:w-0.5 2xl:w-1"></div>
                  {/* Token Icon */}
                  <div className="relative shrink-0 size-10 lg:size-7 xl:size-8 2xl:size-10">
                    <Image
                      src={`/assets/icons/tokens/${baseToken.toLowerCase()}.svg`}
                      alt={order.token}
                      width={40}
                      height={40}
                      className="w-full h-full object-contain rounded-full"
                      onError={(e) => {
                        // Fallback to a generic token icon if specific token icon doesn't exist
                        (e.target as HTMLImageElement).src = "/assets/icons/tokens/tiwicat.svg";
                      }}
                    />
                  </div>
                  {/* Token Name and Type */}
                  <div className="flex flex-col items-start justify-center leading-0 relative shrink-0">
                    <p className="font-semibold leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                      {baseToken}<span className="text-[#b5b5b5]">/{quoteToken}</span>
                    </p>
                    <p className="font-medium leading-normal relative shrink-0 text-sm lg:text-xs xl:text-xs 2xl:text-sm text-center text-[#7c7c7c]">
                      Spot
                    </p>
                  </div>
                </div>
                {/* Value Column */}
                <div className="flex items-center w-[88px] lg:w-[64px] xl:w-[72px] 2xl:w-[88px]">
                  <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                    {order.value}
                  </p>
                </div>
                {/* Quantity Column */}
                <div className="flex items-center w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
                  <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                    {order.quantity}
                  </p>
                </div>
                {/* Margin Column */}
                <div className="flex items-center w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
                  <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                    {order.margin}
                  </p>
                </div>
                {/* Risk Column */}
                <div className="flex items-center w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
                  <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                    {order.risk}
                  </p>
                </div>
                {/* Last Price Column */}
                <div className="flex items-center w-[84px] lg:w-[61px] xl:w-[69px] 2xl:w-[84px]">
                  <p className="font-medium leading-normal relative shrink-0 text-lg lg:text-sm xl:text-base 2xl:text-lg text-white">
                    {order.lastPrice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

