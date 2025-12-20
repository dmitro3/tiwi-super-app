import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import StatusBar from "@/components/layout/status-bar";
import { QueryProvider } from "@/lib/frontend/providers/query-provider";
import { PrefetchProvider } from "@/components/prefetch/prefetch-provider";

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
        <QueryProvider>
          <PrefetchProvider>
            <div className="min-h-screen bg-[#010501] relative">
              <Navbar />
              <StatusBar />
              {children}
            </div>
          </PrefetchProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
