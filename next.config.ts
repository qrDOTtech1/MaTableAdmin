import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types are checked separately; don't block production builds
    ignoreBuildErrors: true,
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "matable.pro" },
      { protocol: "https", hostname: "cdn.matable.pro" },
      { protocol: "https", hostname: "**.matable.pro" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
