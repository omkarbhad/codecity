import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
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
