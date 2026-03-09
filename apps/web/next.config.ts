import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  transpilePackages: ["@codecity/ui", "@codecity/db", "@codecity/core"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
