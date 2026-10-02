/** @type {import('next').NextConfig} */

// Validate environment variables at build time
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`);
  });
  console.error('\n📝 Please check .env.local file or set them in Vercel.');
  console.error('📖 See DEPLOYMENT_GUIDE.md for instructions.\n');
  
  // Only fail in production builds
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variables');
  }
} else {
  console.log('✅ All required environment variables are set');
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src'],
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
  compress: true,
  productionBrowserSourceMaps: false,
  // Routing configuration untuk Next.js & Vercel
  trailingSlash: false,
  skipTrailingSlashRedirect: false,
  // Build configuration
  staticPageGenerationTimeout: 60,
  // Skip static generation for dynamic routes
  skipMiddlewareUrlNormalize: true,
  // Vercel build output
  distDir: '.next',
  // Vercel compatibility
  poweredByHeader: false,
  async headers() {
    let supabaseOrigin = '';
    try { supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch {}
    const sockets = supabaseOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    const policy = ["default-src 'self'", "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:", `connect-src 'self' ${supabaseOrigin} ${sockets}`, "media-src 'self' blob:", "worker-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: policy },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }, { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] }];
  },
  // Experimental - optimize for dynamic routes
  experimental: {
    optimizePackageImports: ['@radix-ui/*', 'lucide-react'],
  },
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
}

module.exports = nextConfig
