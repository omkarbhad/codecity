import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@codecity/ui", "@codecity/db", "@codecity/core"],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  turbopack: {
    rules: {
      '*.svg': ['@svgr/webpack'],
    },
  },
}

export default nextConfig
