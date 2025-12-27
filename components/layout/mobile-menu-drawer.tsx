"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Market", href: "/market" },
  { label: "Swap", href: "/swap" },
  { label: "Pool", href: "/pool" },
  { label: "Earn", href: "/earn" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Settings", href: "/settings" },
];

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({
  open,
  onClose,
}: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle opening and closing states
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      // Trigger animation after a tiny delay to ensure initial render
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else if (shouldRender) {
      // Start closing animation
      setIsClosing(true);
      setIsAnimating(false);
      // Restore body scroll
      document.body.style.overflow = "";
      // Unmount after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !isClosing) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, isClosing, onClose]);

  // Handle navigation click - close drawer
  const handleNavClick = () => {
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop - positioned below navbar */}
      <div
        className={`fixed top-[64px] left-0 right-0 bottom-0 bg-black/60 z-40 ${
          isClosing ? "mobile-menu-backdrop-fade-out" : "mobile-menu-backdrop-fade-in"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - positioned below navbar */}
      <div
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] w-full bg-[#010501] border-l border-[#1f261e] z-50 flex flex-col shadow-[0px_8px_48px_-12px_rgba(0,0,0,0.5)] ${
          isClosing 
            ? "mobile-menu-drawer-slide-out" 
            : isAnimating 
              ? "mobile-menu-drawer-slide-in" 
              : "mobile-menu-drawer-initial"
        }`}
      >
        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto mobile-menu-scrollbar py-2">
          <nav className="flex flex-col">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`px-4 py-3 mx-2 my-1 rounded-lg font-medium text-base transition-colors ${
                    isActive
                      ? "bg-[#081f02] text-[#b1f128] font-semibold"
                      : "text-[#b5b5b5] hover:bg-[#0b0f0a] hover:text-[#b1f128]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
