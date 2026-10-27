import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@frameforge/shared'],
  poweredByHeader: false,
};

export default nextConfig;
