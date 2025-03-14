import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'crests.football-data.org',
      'media-4.api-sports.io',
      'media-3.api-sports.io',
      'media-2.api-sports.io',
      'media-1.api-sports.io',
      'media.api-sports.io',
      'i.ytimg.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'crests.football-data.org',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.api-sports.io',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '**',
      },
    ],
  },
  // Add these options to ignore type and lint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
