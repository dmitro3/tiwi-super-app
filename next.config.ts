import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
  
  // SECURITY FIX: Add Content Security Policy headers to prevent XSS attacks
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.walletconnect.org https://*.walletconnect.com", // WalletConnect requires unsafe-eval
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.walletconnect.org https://*.walletconnect.com https://*.chainbase.online https://api.1inch.com https://api.dexscreener.com https://api.coingecko.com https://api.mymemory.translated.net https://*.supabase.co https://*.alchemy.com https://*.g.alchemy.com https://mm-sdk-analytics.api.cx.metamask.io https://*.rpc.thirdweb.com https://li.quest https://*.li.quest https://api.li.fi https://bsc-dataseed.binance.org https://bsc-dataseed1.binance.org https://bsc-dataseed2.binance.org https://rpc.ankr.com https://api.mainnet-beta.solana.com https://*.infura.io https://*.quicknode.pro wss://*.walletconnect.org wss://*.walletconnect.com",
              "frame-src 'self' https://*.walletconnect.org https://*.walletconnect.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  images: {
    // domains: ['www.rz2.com', 'example.com', 'cdn.dexscreener.com', 'static.debank.com', 'storage.googleapis.com', 'assets.coingecko.com', 'raw.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',  // Allow https protocol
        hostname: '**',     // Allow any hostname (wildcard)
        pathname: '/**',    // Allow any path (wildcard)
      },
      {
        protocol: 'http',   // Allow http protocol (in case some images come via http)
        hostname: '**',     // Allow any hostname (wildcard)
        pathname: '/**',    // Allow any path (wildcard)
      },
      // {
      //   protocol: 'https',
      //   hostname: 'raw.githubusercontent.com',
      //   pathname: '/**',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'storage.googleapis.com',
      //   pathname: '/**',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'assets.coingecko.com',
      //   pathname: '/**',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'cdn.dexscreener.com',
      //   pathname: '/**',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'static.debank.com',
      //   pathname: '/**',
      // },
      // Allow images from your backend API (for proxied images)
      // Note: If you implement image proxying, add your backend domain here
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'api.yourdomain.com',
      //   pathname: '/api/v1/images/**',
      // },
    ],
  },
};

export default nextConfig;
