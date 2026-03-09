import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@codecity/ui", "@codecity/db", "@codecity/core"],
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
