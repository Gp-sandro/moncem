import { cache } from 'react';
import dns from 'node:dns';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/env';
import type { PublicPost, PublicProfile, SchoolSummary, TopicSummary } from '@/lib/types';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Older Node runtimes may not expose this; Supabase fetch still works without it.
}

type PublicProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  connect_status: string | null;
  building_stage: string | null;
  interests: string[] | null;
  school: string | null;
  major: string | null;
  student_status: string | null;
  current_project: string | null;
  accelerator: string | null;
  edu_email_verified: boolean | null;
  created_at: string;
};

type PublicPostRow = {
  id: string;
  slug: string | null;
  type: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  milestone: string | null;
  tags: string[] | null;
  view_count: number | null;
  sparked_count: number | null;
  validated_count: number | null;
  inthis_count: number | null;
  created_at: string;
  author_id: string;
  author_username: string | null;
  author_full_name: string | null;
  author_avatar_url: string | null;
  author_bio: string | null;
  author_location: string | null;
  author_connect_status: string | null;
  author_building_stage: string | null;
  author_interests: string[] | null;
  author_school: string | null;
  author_major: string | null;
  author_student_status: string | null;
  author_current_project: string | null;
  author_accelerator: string | null;
  author_edu_email_verified: boolean | null;
  author_created_at: string;
};

function isConnectStatus(value: string | null): PublicProfile['connectStatus'] {
  if (value === 'open' || value === 'limited' || value === 'closed') return value;
  return 'closed';
}

function isBuildingStage(value: string | null): PublicProfile['buildingStage'] {
  if (value === 'idea' || value === 'mvp' || value === 'launched' || value === 'scaling') return value;
  return null;
}

function isStudentStatus(value: string | null): PublicProfile['studentStatus'] {
  if (
    value === 'high_school' ||
    value === 'undergrad' ||
    value === 'grad' ||
    value === 'recently_graduated' ||
    value === 'gap_year' ||
    value === 'dropped_out'
  ) {
    return value;
  }
  return null;
}

function mapProfile(row: PublicProfileRow): PublicProfile {
  const username = row.username ?? 'student-founder';
  return {
    id: row.id,
    username,
    fullName: row.full_name ?? username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    connectStatus: isConnectStatus(row.connect_status),
    buildingStage: isBuildingStage(row.building_stage),
    interests: row.interests ?? [],
    school: row.school,
    major: row.major,
    studentStatus: isStudentStatus(row.student_status),
    currentProject: row.current_project,
    accelerator: row.accelerator,
    eduEmailVerified: Boolean(row.edu_email_verified),
    createdAt: row.created_at,
  };
}

function mapAuthor(row: PublicPostRow): PublicProfile {
  return mapProfile({
    id: row.author_id,
    username: row.author_username,
    full_name: row.author_full_name,
    avatar_url: row.author_avatar_url,
    bio: row.author_bio,
    location: row.author_location,
    connect_status: row.author_connect_status,
    building_stage: row.author_building_stage,
    interests: row.author_interests,
    school: row.author_school,
    major: row.author_major,
    student_status: row.author_student_status,
    current_project: row.author_current_project,
    accelerator: row.author_accelerator,
    edu_email_verified: row.author_edu_email_verified,
    created_at: row.author_created_at,
  });
}

function mapPost(row: PublicPostRow): PublicPost {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    type: row.type as PublicPost['type'],
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverUrl: row.cover_url,
    milestone: row.milestone,
    tags: row.tags ?? [],
    viewCount: row.view_count ?? 0,
    sparkedCount: row.sparked_count ?? 0,
    validatedCount: row.validated_count ?? 0,
    inthisCount: row.inthis_count ?? 0,
    createdAt: row.created_at,
    author: mapAuthor(row),
  };
}

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return fetch(input, init);
  }
};

async function getSupabase(): Promise<SupabaseClient> {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: supabaseFetch,
    },
  });
}

export const getRecentPosts = cache(async (limit = 12): Promise<PublicPost[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentPosts: ${error.message}`);
  return ((data ?? []) as PublicPostRow[]).map(mapPost);
});

export const getPostsByTag = cache(async (tag: string, limit = 20): Promise<PublicPost[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('*')
    .contains('tags', [tag])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getPostsByTag: ${error.message}`);
  return ((data ?? []) as PublicPostRow[]).map(mapPost);
});

export const getPostBySlug = cache(async (slug: string): Promise<PublicPost | null> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('*')
    .eq('slug', slug)
    .limit(1);

  if (error) throw new Error(`getPostBySlug(${slug}): ${error.message}`);
  const row = ((data ?? []) as PublicPostRow[])[0];
  return row ? mapPost(row) : null;
});

export const getProfileByUsername = cache(async (username: string): Promise<PublicProfile | null> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('*')
    .eq('username', username)
    .limit(1);

  if (error) throw new Error(`getProfileByUsername(${username}): ${error.message}`);
  const row = ((data ?? []) as PublicProfileRow[])[0];
  return row ? mapProfile(row) : null;
});

export const getPostsByUsername = cache(async (username: string): Promise<PublicPost[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('*')
    .eq('author_username', username)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(`getPostsByUsername(${username}): ${error.message}`);
  return ((data ?? []) as PublicPostRow[]).map(mapPost);
});

// Real members for the Founders list (every public profile, newest first).
export const getMembers = cache(async (limit = 60): Promise<PublicProfile[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getMembers: ${error.message}`);
  return ((data ?? []) as PublicProfileRow[]).map(mapProfile);
});

// Lightweight sources for the sitemap.
export const getSitemapPosts = cache(async (): Promise<Array<{ slug: string; createdAt: string }>> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('slug, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw new Error(`getSitemapPosts: ${error.message}`);
  return ((data ?? []) as Array<{ slug: string | null; created_at: string }>)
    .filter((row): row is { slug: string; created_at: string } => Boolean(row.slug))
    .map((row) => ({ slug: row.slug, createdAt: row.created_at }));
});

export const getSitemapProfiles = cache(async (): Promise<string[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('username')
    .not('username', 'is', null)
    .limit(1000);

  if (error) throw new Error(`getSitemapProfiles: ${error.message}`);
  return ((data ?? []) as Array<{ username: string | null }>)
    .map((row) => row.username)
    .filter((username): username is string => Boolean(username));
});

export const getFeaturedProfiles = cache(async (limit = 6): Promise<PublicProfile[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('*')
    .not('current_project', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getFeaturedProfiles: ${error.message}`);
  return ((data ?? []) as PublicProfileRow[]).map(mapProfile);
});

export type ConnectProfileFilters = {
  status?: PublicProfile['connectStatus'];
  interest?: string;
  school?: string;
  limit?: number;
};

export const getConnectableProfiles = cache(async ({
  status,
  interest,
  school,
  limit = 12,
}: ConnectProfileFilters = {}): Promise<PublicProfile[]> => {
  const supabase = await getSupabase();
  let query = supabase
    .from('public_profiles_web')
    .select('*')
    .neq('connect_status', 'closed');

  if (status === 'open' || status === 'limited') {
    query = query.eq('connect_status', status);
  }

  if (interest) {
    query = query.contains('interests', [interest]);
  }

  if (school) {
    query = query.eq('school', school);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

  if (error) throw new Error(`getConnectableProfiles: ${error.message}`);
  return ((data ?? []) as PublicProfileRow[]).map(mapProfile);
});

export const getProfilesBySchool = cache(async (school: string, limit = 24): Promise<PublicProfile[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('*')
    .eq('school', school)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getProfilesBySchool(${school}): ${error.message}`);
  return ((data ?? []) as PublicProfileRow[]).map(mapProfile);
});

export const getPostsBySchool = cache(async (school: string, limit = 20): Promise<PublicPost[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_posts_web')
    .select('*')
    .eq('author_school', school)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getPostsBySchool(${school}): ${error.message}`);
  return ((data ?? []) as PublicPostRow[]).map(mapPost);
});

export const getTopicSummaries = cache(async (): Promise<TopicSummary[]> => {
  const posts = await getRecentPosts(50);
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
});

export const getSchoolSummaries = cache(async (): Promise<SchoolSummary[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('public_profiles_web')
    .select('school')
    .not('school', 'is', null)
    .limit(500);

  if (error) throw new Error(`getSchoolSummaries: ${error.message}`);

  const counts = new Map<string, number>();

  for (const row of (data ?? []) as Pick<PublicProfileRow, 'school'>[]) {
    if (!row.school) continue;
    counts.set(row.school, (counts.get(row.school) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([school, count]) => ({ school, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
});
