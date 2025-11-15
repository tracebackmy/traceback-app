/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'images.unsplash.com',
      'lh3.googleusercontent.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // TypeScript handling
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint handling
  eslint: {
    ignoreDuringBuilds: true,
  },

  // React strict mode
  reactStrictMode: true,

  // Experimental features
  experimental: {
    esmExternals: true,
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig