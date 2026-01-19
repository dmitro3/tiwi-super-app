"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import StatusBar from "@/components/layout/status-bar";
import { useWalletStoreSync } from "@/lib/wallet/hooks/useWalletStoreSync";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  
  // Sync wallet store with keystore on mount
  useWalletStoreSync();

  return (
    <>
      {!isAdminRoute && (
        <>
          <Navbar />
          <StatusBar />
        </>
      )}
      {children}
    </>
  );
}

