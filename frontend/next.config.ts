import type { NextConfig } from "next";
const CopyPlugin = require("copy-webpack-plugin");

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Temporarily disable strict mode for debugging
  productionBrowserSourceMaps: true, // Enable source maps in production
  
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
            to: "static/chunks/",
          },
        ],
      })
    );
    return config;
  },
};

export default nextConfig;
