"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import StatusBar from "@/components/layout/status-bar";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

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

