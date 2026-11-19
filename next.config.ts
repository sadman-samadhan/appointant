import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Small self-contained server for the Docker image (see Dockerfile).
  output: 'standalone',
  // The shop's plain website: public/website (Amatic SC titles) at /website,
  // public/website2 (Pacifico titles) at /website2.
  async rewrites() {
    return [
      { source: '/website', destination: '/website/index.html' },
      { source: '/website2', destination: '/website2/index.html' },
    ];
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
