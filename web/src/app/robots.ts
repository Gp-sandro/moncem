import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/schools', '/privacy', '/join', '/login', '/signup'],
        disallow: [
          '/feed',
          '/connect',
          '/post',
          '/p',
          '/u',
          '/settings',
          '/inbox',
          '/notifications',
          '/sparked',
          '/me',
          '/admin',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
