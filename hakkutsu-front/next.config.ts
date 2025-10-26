import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during production builds on Vercel remote builders.
  // This avoids CI failing on lint errors; local dev can still lint via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep type checking during build; set to true only if you want to bypass TS errors.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
