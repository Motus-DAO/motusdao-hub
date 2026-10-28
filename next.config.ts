import type { NextConfig } from "next";

const workAdventureFrameAncestors =
  "frame-ancestors 'self' https://metaverso.motusdao.org https://play.workadventu.re https://*.workadventu.re;";

const nextConfig: NextConfig = {
  experimental: {
    // Scanned cédula PDFs plus the multipart envelope exceed the 10MB default.
    middlewareClientMaxBodySize: '25mb',
  },
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
  async redirects() {
    return [
      {
        source: '/motusai',
        destination: '/psychat',
        permanent: true,
      },
      {
        source: '/motusai/:path*',
        destination: '/psychat/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/psychat",
        headers: [
          {
            key: "Content-Security-Policy",
            value: workAdventureFrameAncestors,
          },
        ],
      },
      {
        source: "/psychat/:path*",
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
