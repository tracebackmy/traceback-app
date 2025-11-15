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

  // Experimental features to fix build issues
  experimental: {
    // This helps with the useSearchParams() suspense issue
    missingSuspenseWithCSRBailout: false,
    // Better bundling
    esmExternals: true,
  },

  // Compiler options
  compiler: {
    // Remove console logs in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Environment variables
  env: {
    // Add any custom env vars you want to expose to the browser
  },
}

module.exports = nextConfig