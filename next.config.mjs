/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ← 型エラーを無視
  },
  eslint: {
    ignoreDuringBuilds: true, // ← Lintエラーも無視（任意）
  },
};

export default nextConfig;
