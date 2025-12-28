"use client";
import Image from "next/image";
import { SIDEBAR_ICONS, SOCIAL_ICONS } from "@/lib/home/mock-data";
import { useMemo } from "react";
import { useRouter } from "next/navigation";


type SidebarItem = {
    label: string;
    icon: string;
    badge?: string;
    link: string;
};

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const router = useRouter()
    const quickActions = useMemo<SidebarItem[]>(
        () => [
            { label: "Swap", icon: SIDEBAR_ICONS.swap, link: '/swap' },
            { label: "Stake", icon: SIDEBAR_ICONS.stake, link: '/earn' },
            { label: "History", icon: SIDEBAR_ICONS.history, link: '/portfolio' },
            { label: "Lend", icon: SIDEBAR_ICONS.lend, badge: "Coming soon", link: '/lend' },
        ],
        []
    );

    const footerLinks = useMemo<SidebarItem[]>(
        () => [
            { label: "Download App", icon: SIDEBAR_ICONS.download, link: "#" },
            { label: "Support Hub", icon: SIDEBAR_ICONS.support, link: "#" },
        ],
        []
    );

    return (
        <aside
            className={`bg-[#010501] border-r border-[#1f261e] flex flex-col justify-between py-4 ${collapsed ? "w-[80px]" : "w-[250px]"
                } transition-all duration-200`}
        >
            <div className="flex flex-col gap-2 px-4">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-3 px-2 py-3 hover:bg-[#0b0f0a] rounded-lg transition-colors"
                >
                    <span className="relative inline-flex items-center justify-center">
                        <Image src={SIDEBAR_ICONS.collapse} alt="Collapse" width={24} height={24} />
                    </span>
                    {!collapsed && <span className="text-[#b5b5b5] text-base font-medium">Collapse</span>}
                </button>

                {!collapsed && (
                    <div className="px-2 pt-2 pb-1 text-[#7c7c7c] text-sm font-semibold">Quick Actions</div>
                )}

                <div className="flex flex-col">
                    {quickActions.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.link)}
                            className="flex items-center gap-3 px-2 py-3 hover:bg-[#0b0f0a] rounded-lg transition-colors text-left cursor-pointer"
                        >
                            <Image src={item.icon} alt={item.label} width={24} height={24} />
                            {!collapsed && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[#b5b5b5] text-base font-medium">{item.label}</span>
                                    {item.badge && (
                                        <span className="bg-[#081f02] text-[#b1f128] text-xs font-semibold px-2 py-1 rounded-md">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 px-4 pb-4 border-t border-[#1f261e] pt-4">
                <div className="flex flex-col gap-1">
                    {footerLinks.map((item) => (
                        <button
                            key={item.label}
                            className="flex items-center gap-3 px-2 py-3 hover:bg-[#0b0f0a] rounded-lg transition-colors text-left"
                        >
                            <Image src={item.icon} alt={item.label} width={24} height={24} />
                            {!collapsed && <span className="text-[#b5b5b5] text-base font-medium">{item.label}</span>}
                        </button>
                    ))}
                </div>
                <div
                    className={
                        collapsed
                            ? "flex flex-col items-center gap-2 px-2 pt-2"
                            : "flex items-center gap-4 px-2 pt-2"
                    }
                >
                    <Image src={SOCIAL_ICONS.twitter} alt="Twitter" width={20} height={20} />
                    <Image src={SOCIAL_ICONS.telegram} alt="Telegram" width={20} height={20} />
                </div>
            </div>
        </aside>
    );
}

