import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        // Public, unfurlable surfaces: the feed, dispatches, profiles, marketing.
        allow: ['/', '/feed', '/explore', '/founders', '/p', '/u', '/privacy', '/join', '/login', '/signup'],
        disallow: [
          '/post',
          '/settings',
          '/inbox',
          '/notifications',
          '/sparked',
          '/me',
          '/connect',
          '/schools',
          '/admin',
          '/api',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
