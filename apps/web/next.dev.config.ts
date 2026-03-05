import type { NextConfig } from "next"
import baseConfig from "./next.config"

const devConfig: NextConfig = {
  ...baseConfig,
  experimental: {
    ...baseConfig.experimental,
    optimizeCss: true,
    turbo: {
      ...baseConfig.experimental?.turbo,
      resolveAlias: {
        ...baseConfig.experimental?.turbo?.resolveAlias,
        '@': './src',
      },
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

export default devConfig
