import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/layout/conditional-layout";
import GlobalBackground from "@/components/layout/global-background";
import { PrefetchProvider } from "@/components/prefetch/prefetch-provider";
import { WalletProviders } from "@/lib/frontend/providers/wallet-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "TIWI Protocol",
  description: "TIWI Protocol - Decentralized Finance Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProviders>
          <PrefetchProvider>
            <div className="min-h-screen bg-[#010501] relative">
              {/* Global Background System - Applied to all pages */}
              <GlobalBackground />
              
              {/* Content Layers - Above background */}
              <div className="relative z-10">
                <ConditionalLayout>{children}</ConditionalLayout>
              </div>
            </div>
          </PrefetchProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
