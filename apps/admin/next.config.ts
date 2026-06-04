import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@selo/shared', '@selo/types', '@selo/config'],
};

export default nextConfig;
