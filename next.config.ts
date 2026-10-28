import type { NextConfig } from "next";

const workAdventureFrameAncestors =
  "frame-ancestors 'self' https://metaverso.motusdao.org https://play.workadventu.re https://*.workadventu.re;";

/** Paths not needed at runtime — keeps Vercel serverless traces smaller/faster. */
const traceExcludeGlobs = [
  "./archive/**",
  "./infra/**",
  "./jitsi/**",
  "./scripts/**",
  "./specs/**",
  "./contracts/*.sol",
  "./node_modules/@nomicfoundation/**",
  "./node_modules/hardhat/**",
  "./node_modules/@openzeppelin/contracts/**",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingExcludes: {
    "*": traceExcludeGlobs,
  },
  experimental: {
    // Scanned cédula PDFs plus the multipart envelope exceed the 10MB default.
    middlewareClientMaxBodySize: "25mb",
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
    ],
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
