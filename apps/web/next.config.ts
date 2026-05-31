import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mirai/shared-types'],
};

export default nextConfig;
