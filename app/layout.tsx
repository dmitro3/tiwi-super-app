import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/layout/conditional-layout";
import GlobalBackground from "@/components/layout/global-background";
import SetHtmlLang from "@/components/layout/set-html-lang";
import { PrefetchProvider } from "@/components/prefetch/prefetch-provider";
import { WalletProviders } from "@/lib/frontend/providers/wallet-providers";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
//   display: "swap",
//   preload: true,
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
//   display: "swap",
//   preload: true,
// });

export const metadata: Metadata = {
  title: "TIWI Protocol",
  description: "A mobile first multi chain DeFi super application for swapping, staking, liquidity, lending, NFTs, payments, and on chain deals.",
  keywords: [
    "TIWI Protocol",
    "DeFi super app",
    "multichain DEX",
    "crypto swap",
    "cross chain swap",
    "staking",
    "yield farming",
    "liquidity pools",
    "NFT marketplace",
    "crypto payments",
    "Web3 wallet",
    "decentralized finance",
    "TIWICAT",
    "TWC",
  ],
  authors: [{ name: "TIWI Protocol" }],
  creator: "TIWI Protocol",
  publisher: "TIWI Protocol",
  category: "Finance, Blockchain, Decentralized Finance",
  metadataBase: new URL("https://tiwiprotocol.xyz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TIWI Protocol - One app. All of DeFi.",
    description: "TIWI Protocol is a mobile first multi chain DeFi super application that brings decentralized finance into one seamless experience. The platform combines spot swapping through a smart aggregator, cross chain liquidity, staking, yield vaults, lending and borrowing, NFT marketplace, P2P exchange, deal brokerage, launchpad, and crypto payments.",
    url: "https://tiwiprotocol.xyz",
    siteName: "TIWI Protocol",
    images: [
      {
        url: "/Metadata.png",
        width: 1200,
        height: 630,
        alt: "TIWI Protocol - DeFi Super App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIWI Protocol - One app. All of DeFi.",
    description: "A mobile first multi chain DeFi super application for swapping, staking, liquidity, lending, NFTs, payments, and on chain deals.",
    images: ["/Metadata.png"],
    creator: "@tiwiprotocol",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/Metadata.png", sizes: "512x512", type: "image/png" },
      { url: "/Metadata.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/Metadata.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  applicationName: "TIWI Protocol",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TIWI Protocol",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
      // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProviders>
          <PrefetchProvider>
            <SetHtmlLang />
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
