import type { NextConfig } from 'next'

const apiProxy = process.env.API_PROXY_URL ?? 'http://127.0.0.1:4000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxy}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
