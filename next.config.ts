import type { NextConfig } from "next";
import packageJson from "./package.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  output: 'standalone',
  // Shown next to the app name; comes from package.json so it matches the release.
  env: { NEXT_PUBLIC_APP_VERSION: packageJson.version },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://aerocat.tech https://*.aerocat.tech;",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
