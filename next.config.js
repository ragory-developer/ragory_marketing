/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ['tanning-disobey-football.ngrok-free.dev'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
    workerThreads: false,
    cpus: 1,
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
