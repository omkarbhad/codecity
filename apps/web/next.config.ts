import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@codecity/ui", "@codecity/db", "@codecity/core"],
}

export default nextConfig
