/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Next.js 14ではappDirはデフォルトで有効
  experimental: {
    // appDir: true は不要
  },
}

module.exports = nextConfig

