/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['app', 'components', 'lib', 'src'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  // Optimization untuk production
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  // Routing configuration untuk Next.js & Vercel
  trailingSlash: false,
  skipTrailingSlashRedirect: false,
  // Build configuration
  staticPageGenerationTimeout: 60,
  // Vercel build output
  distDir: '.next',
  // Vercel compatibility
  poweredByHeader: false,
  // Rewrites untuk SPA-like behavior jika diperlukan
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    }
  },
  // Environment
  env: {
    NEXT_PUBLIC_APP_NAME: 'NIVO App',
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/*', 'lucide-react'],
  },
}

module.exports = nextConfig