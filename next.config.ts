import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  // The dev indicator badge sits on top of the app's icon rail.
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  compiler: {
    removeConsole: false,
  },
  turbopack: {
    rules: {
      '*.svg': ['@svgr/webpack'],
    },
  },
}

export default nextConfig
