"use client";

import { useState, useEffect, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoHomeOutline,
  IoChevronBackOutline,
  IoNotificationsOutline,
  IoWalletOutline,
  IoWaterOutline,
  IoAlertCircleOutline,
  IoDownloadOutline,
  IoDocumentTextOutline,
  IoSearchOutline,
  IoPersonOutline,
  IoChevronDownOutline,
} from "react-icons/io5";
import { HiOutlineBolt } from "react-icons/hi2";
import { TbCoins } from "react-icons/tb";

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle: string;
  activeNavItem?: string;
}

export default function AdminLayout({
  children,
  pageTitle,
  activeNavItem,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState("09:40");
  const pathname = usePathname();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { icon: IoHomeOutline, label: "Dashboard", href: "/admin", key: "dashboard" },
    { icon: IoChevronBackOutline, label: "Collapse", action: true, key: "collapse" },
    { icon: HiOutlineBolt, label: "Quick Actions", href: "#", key: "quick-actions" },
    { icon: TbCoins, label: "Tokens", href: "/admin/tokens", key: "tokens" },
    { icon: IoNotificationsOutline, label: "Notifications", href: "/admin/notifications", key: "notifications" },
    { icon: IoWalletOutline, label: "Staking Pools", href: "/admin/staking-pools", key: "staking-pools" },
    { icon: IoWaterOutline, label: "Liquidity Pools", href: "/admin/liquidity-pools", key: "liquidity-pools" },
    { icon: IoAlertCircleOutline, label: "Create Adverts", href: "/admin/adverts", key: "create-adverts" },
    { icon: IoDownloadOutline, label: "Download App", href: "#", key: "download-app" },
    { icon: IoDocumentTextOutline, label: "Support Hub", href: "#", key: "support-hub" },
  ];

  return (
    <div className="min-h-screen bg-[#010501] flex">
      {/* Sidebar - Hidden on mobile */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } hidden lg:flex bg-[#0b0f0a] border-r border-[#1f261e] transition-all duration-300 flex-col shrink-0`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-center">
          <div className="h-10 w-10 relative">
            <Image
              src="/assets/logos/tiwi-logo.svg"
              alt="TIWI Logo"
              width={40}
              height={40}
              className="object-contain w-full h-full"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeNavItem ? activeNavItem === item.key : (item.href && item.href !== "#" && pathname === item.href);
            const isCollapse = item.action;

            if (isCollapse) {
              return (
                <button
                  key={index}
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#b5b5b5] hover:text-white hover:bg-[#121712] rounded-lg transition-colors"
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              );
            }

            const content = (
              <>
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </>
            );

            if (item.href) {
              const isComingSoon = item.key === "liquidity-pools";
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? "bg-[#121712] text-[#b1f128]"
                      : "text-[#b5b5b5] hover:text-white hover:bg-[#121712]"
                  }`}
                >
                  {content}
                  {isComingSoon && !sidebarCollapsed && (
                    <span className="ml-auto px-2 py-0.5 bg-[#081f02] border border-[#b1f128] rounded text-[#b1f128] text-xs font-medium whitespace-nowrap">
                      Soon
                    </span>
                  )}
                  {isComingSoon && sidebarCollapsed && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#b1f128] rounded-full"></span>
                  )}
                </Link>
              );
            }

            return (
              <button
                key={index}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#121712] text-[#b1f128]"
                    : "text-[#b5b5b5] hover:text-white hover:bg-[#121712]"
                }`}
              >
                {content}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Time */}
        <div className="lg:hidden bg-[#010501] px-4 py-2 flex items-center justify-between border-b border-[#1f261e]">
          <div className="text-white font-medium text-sm">{currentTime}</div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="bg-[#0b0f0a] border-b border-[#1f261e] px-4 lg:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl lg:text-2xl font-semibold text-white">{pageTitle}</h1>
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Search */}
            <div className="relative hidden lg:block">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
              <input
                type="text"
                placeholder="Search Dashboard..."
                className="bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] w-64"
              />
            </div>
            {/* User Profile */}
            <button className="flex items-center gap-2 px-3 py-2 bg-[#121712] border border-[#1f261e] rounded-lg hover:bg-[#1a1f1a] transition-colors">
              <div className="flex flex-col items-end">
                <span className="text-white text-xs font-medium">0x95...3545</span>
                <span className="text-[#b5b5b5] text-xs">Admin</span>
              </div>
              <IoChevronDownOutline className="w-4 h-4 lg:w-5 lg:h-5 text-[#b1f128]" />
            </button>
            {/* Time - Desktop only */}
            <div className="text-white font-medium hidden lg:block">{currentTime}</div>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}

