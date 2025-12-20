import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
