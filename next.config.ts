import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types are checked separately; don't block production builds
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
