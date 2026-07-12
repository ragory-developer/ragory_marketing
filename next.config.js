/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    unoptimized: true, // Speeds up build if not using Next.js Image Optimization
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
