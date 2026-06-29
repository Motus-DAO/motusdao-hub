import type { NextConfig } from "next";

const workAdventureFrameAncestors =
  "frame-ancestors 'self' https://metaverso.motusdao.org https://play.workadventu.re https://*.workadventu.re;";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/motusai",
        headers: [
          {
            key: "Content-Security-Policy",
            value: workAdventureFrameAncestors,
          },
        ],
      },
      {
        source: "/motusai/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: workAdventureFrameAncestors,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
