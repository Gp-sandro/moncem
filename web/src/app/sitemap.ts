import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';
import { getSitemapPosts, getSitemapProfiles } from '@/lib/data';
import { safeArray } from '@/lib/safe-data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const [posts, usernames] = await Promise.all([
    safeArray(getSitemapPosts()),
    safeArray(getSitemapProfiles()),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/founders`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/p/${post.slug}`,
    lastModified: new Date(post.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const profileEntries: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${siteUrl}/u/${username}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticEntries, ...postEntries, ...profileEntries];
}
