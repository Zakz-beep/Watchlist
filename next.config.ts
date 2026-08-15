import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
  // Allow external packages on server (yahoo-finance2 uses fetch)
  serverExternalPackages: ["yahoo-finance2"],
  // Allow external image sources for ticker logos
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "financialmodelingprep.com" },
      { protocol: "https", hostname: "s.yimg.com" },
      { protocol: "https", hostname: "*.seekingalpha.com" },
    ],
  },
};

export default nextConfig;
