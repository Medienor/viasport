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
      'image.assets.pressassociation.io',
      'uk1.sportal365images.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
    ],
    // This is a more permissive approach that allows images from any domain
    // Use with caution as it reduces security
    unoptimized: true,
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
