import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return ['/', '/explore', '/schools', '/privacy'].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'daily',
    priority: path === '/' ? 1 : 0.7,
  }));
}
