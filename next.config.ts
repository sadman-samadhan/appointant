import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Small self-contained server for the Docker image (see Dockerfile).
  output: 'standalone',
  // The shop's plain website lives in public/website; show it at /website.
  async rewrites() {
    return [{ source: '/website', destination: '/website/index.html' }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '3.6.123.11',
      },
    ],
  },
};

export default nextConfig;
