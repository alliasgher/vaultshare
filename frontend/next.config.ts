import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Temporarily disable strict mode for debugging
  productionBrowserSourceMaps: true, // Enable source maps in production
};

export default nextConfig;
