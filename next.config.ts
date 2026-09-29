import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Trailing slash helps Capacitor file:// routing
  trailingSlash: true,
};

export default nextConfig;
