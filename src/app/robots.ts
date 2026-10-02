import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/signin',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/otp-verification',
          '/password-reset-success',
          '/auth',
          '/profile-settings',
          '/notifications',
          '/tracker',
          '/craving-history',
          '/craving-support',
          '/ai-result',
          '/contact-professional',
          '/community',
          '/distractions',
          '/breathing-exercise',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
