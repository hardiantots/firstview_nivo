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
  // Routing & trailing slash
  trailingSlash: false,
  // Build configuration
  staticPageGenerationTimeout: 60,
  experimental: {
    optimizePackageImports: ['@radix-ui/*', 'lucide-react'],
  },
}

module.exports = nextConfig