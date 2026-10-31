import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Small self-contained server for the Docker image (see Dockerfile).
  output: 'standalone',
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
