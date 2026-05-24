import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  AppNotification,
  BuildingStage,
  ConnectStatus,
  Conversation,
  CreatePostPayload,
  CreateReportPayload,
  Message,
  NotificationType,
  Post,
  Profile,
  ReactionCounts,
  ReactionType,
  UpdateProfilePayload,
} from './types';

const PUBLIC_PROFILE_SELECT =
  'id, username, full_name, avatar_url, bio, location, connect_status, building_stage, interests, created_at';

const POST_WITH_AUTHOR_SELECT =
  `id, type, title, excerpt, body, cover_url, milestone, tags, view_count, sparked_count, validated_count, inthis_count, created_at, profiles!author_id(${PUBLIC_PROFILE_SELECT})`;

// ─── Guards ──────────────────────────────────────────────────────────────────

function assertEmailVerified(session: Session | null): asserts session is Session {
  if (!session?.user.email_confirmed_at) {
    throw new Error('Please verify your email address before performing this action.');
  }
}

// ─── Transformers ────────────────────────────────────────────────────────────

function toProfile(row: Record<string, unknown>): Profile {
  const fullName = String(row.full_name ?? '');
  const initials =
    fullName
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || String(row.username ?? '').slice(0, 2).toUpperCase();
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    fullName,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    initials,
    createdAt: String(row.created_at ?? ''),
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    onboarded: Boolean(row.onboarded ?? false),
    onboardingCompleted: Boolean(row.onboarding_completed ?? false),
    emailVerified: Boolean(row.email_verified ?? false),
    connectStatus: (row.connect_status as ConnectStatus) ?? 'closed',
    buildingStage: (row.building_stage as BuildingStage | null) ?? null,
    location: (row.location as string | null) ?? null,
  };
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

function toPost(
  row: Record<string, unknown>,
  userReactions: ReactionType[] = [],
): Post {
  const profileRow = (row.profiles as Record<string, unknown> | null) ?? {};
  const reactionCounts: ReactionCounts = {
    sparked: Number(row.sparked_count ?? 0),
    validated: Number(row.validated_count ?? 0),
    inthis: Number(row.inthis_count ?? 0),
  };
  return {
    id: String(row.id),
    type: row.type as Post['type'],
    title: String(row.title ?? ''),
    excerpt: (row.excerpt as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    milestone: (row.milestone as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    viewCount: Number(row.view_count ?? 0),
    createdAt: formatRelativeTime(String(row.created_at ?? '')),
    author: toProfile(profileRow),
    reactionCounts,
    userReactions,
  };
}

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(
  userId: string,
  postId: string,
  type: ReactionType,
): Promise<void> {
  const { data: existing, error: checkErr } = await supabase
    .from('reactions')
    .select('type')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .eq('type', type)
    .maybeSingle();
  if (checkErr) throw new Error(`toggleReaction(check): ${checkErr.message}`);

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
      .eq('type', type);
    if (error) throw new Error(`toggleReaction(delete): ${error.message}`);
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({ user_id: userId, post_id: postId, type });
    if (error) throw new Error(`toggleReaction(insert): ${error.message}`);
  }
}

export async function fetchReactionsForUser(
  userId: string,
  postIds: string[],
): Promise<Record<string, ReactionType[]>> {
  if (!userId || postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, type')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) throw new Error(`fetchReactionsForUser: ${error.message}`);

  const map: Record<string, ReactionType[]> = {};
  for (const row of data ?? []) {
    const pid = row.post_id as string;
    const t = row.type as ReactionType;
    if (!map[pid]) map[pid] = [];
    map[pid].push(t);
  }
  return map;
}

export async function fetchReactionsForPost(
  postId: string,
): Promise<ReactionType[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from('reactions')
    .select('type')
    .eq('user_id', session.user.id)
    .eq('post_id', postId);
  if (error) throw new Error(`fetchReactionsForPost: ${error.message}`);
  return (data ?? []).map((r) => r.type as ReactionType);
}

export async function fetchSparkedPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select(`post_id, posts(${POST_WITH_AUTHOR_SELECT})`)
    .eq('user_id', userId)
    .eq('type', 'sparked')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchSparkedPosts: ${error.message}`);

  const postIds = (data ?? []).map((r) => r.post_id as string);
  const userReactionsMap = await fetchReactionsForUser(userId, postIds);

  return (data ?? [])
    .map((row) => (row as { posts: unknown }).posts)
    .filter((p): p is Record<string, unknown> => p !== null && p !== undefined)
    .map((p) => toPost(p, userReactionsMap[String(p.id)] ?? []));
}

export async function fetchRecentSparkers(
  postId: string,
  limit = 3,
): Promise<Pick<Profile, 'id' | 'initials' | 'fullName'>[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('profiles!user_id(id, full_name, username)')
    .eq('post_id', postId)
    .eq('type', 'sparked')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchRecentSparkers: ${error.message}`);

  return (data ?? [])
    .map((row) => {
      const joined = (row as { profiles?: unknown }).profiles;
      const p = Array.isArray(joined) ? joined[0] : joined;
      if (!p || typeof p !== 'object') return null;
      const profile = p as Record<string, unknown>;
      const fullName = String(profile.full_name ?? profile.username ?? '');
      const initials =
        fullName
          .split(' ')
          .map((w: string) => w[0] ?? '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || String(profile.username ?? '').slice(0, 2).toUpperCase();
      return { id: String(profile.id), fullName, initials };
    })
    .filter((p): p is Pick<Profile, 'id' | 'initials' | 'fullName'> => p !== null);
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export async function fetchFeed(
  filter: 'new' | 'top' | 'trending',
  userId = '',
): Promise<Post[]> {
  let query = supabase
    .from('posts')
    .select(POST_WITH_AUTHOR_SELECT);

  if (filter === 'trending') {
    // Weighted score: sparked*3 + validated*2 + inthis*1, last 7 days
    query = query
      .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order('sparked_count', { ascending: false })
      .limit(20);
  } else if (filter === 'top') {
    query = query.order('view_count', { ascending: false }).limit(20);
  } else {
    query = query.order('created_at', { ascending: false }).limit(20);
  }

  const { data, error } = await query;
  if (error) throw new Error(`fetchFeed(${filter}): ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];

  if (filter === 'trending') {
    rows.sort((a, b) => {
      const score = (r: Record<string, unknown>) =>
        Number(r.sparked_count ?? 0) * 3 +
        Number(r.validated_count ?? 0) * 2 +
        Number(r.inthis_count ?? 0);
      return score(b) - score(a);
    });
  }

  const postIds = rows.map((r) => String(r.id));
  const userReactionsMap = userId
    ? await fetchReactionsForUser(userId, postIds)
    : {};

  return rows.map((r) => toPost(r, userReactionsMap[String(r.id)] ?? []));
}

export async function fetchPostById(id: string, userId = ''): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_AUTHOR_SELECT)
    .eq('id', id)
    .single();
  if (error) throw new Error(`fetchPostById: ${error.message}`);

  const userReactionsMap = userId
    ? await fetchReactionsForUser(userId, [id])
    : {};

  return toPost(data as Record<string, unknown>, userReactionsMap[id] ?? []);
}

export async function fetchPostsByAuthor(
  userId: string,
  viewerId = '',
): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_AUTHOR_SELECT)
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchPostsByAuthor: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  const postIds = rows.map((r) => String(r.id));
  const userReactionsMap = viewerId
    ? await fetchReactionsForUser(viewerId, postIds)
    : {};

  return rows.map((r) => toPost(r, userReactionsMap[String(r.id)] ?? []));
}

export async function fetchPostsByTag(tag: string, userId = ''): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_AUTHOR_SELECT)
    .contains('tags', [tag])
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(`fetchPostsByTag: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  const postIds = rows.map((r) => String(r.id));
  const userReactionsMap = userId
    ? await fetchReactionsForUser(userId, postIds)
    : {};

  return rows.map((r) => toPost(r, userReactionsMap[String(r.id)] ?? []));
}

export async function fetchAllTags(): Promise<string[]> {
  const { data, error } = await supabase.from('posts').select('tags');
  if (error) return [];
  const all = (data ?? []).flatMap((r) => (r.tags as string[]) ?? []);
  return [...new Set(all)].sort();
}

export async function fetchTagsWithCounts(): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase.from('posts').select('tags');
  if (error) return [];
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    for (const tag of (Array.isArray(row.tags) ? row.tags : []) as string[]) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
}

export async function fetchBuilders(limit = 3): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .not('full_name', 'is', null)
    .neq('full_name', '')
    .not('bio', 'is', null)
    .neq('bio', '')
    .neq('connect_status', 'closed')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchBuilders: ${error.message}`);
  return (data ?? []).map((r) => toProfile(r as Record<string, unknown>));
}

export async function fetchAllBuilders(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .not('full_name', 'is', null)
    .neq('full_name', '')
    .neq('connect_status', 'closed')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchAllBuilders: ${error.message}`);
  return (data ?? []).map((r) => toProfile(r as Record<string, unknown>));
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user.id !== userId) {
    return fetchPublicProfile(userId);
  }

  const { data, error } = await supabase.rpc('get_own_profile').single();
  if (error) throw new Error(`fetchProfile: ${error.message}`);
  return toProfile(data as Record<string, unknown>);
}

export async function fetchPublicProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .eq('id', userId)
    .single();
  if (error) throw new Error(`fetchPublicProfile: ${error.message}`);
  return toProfile(data as Record<string, unknown>);
}

export async function ensureProfile(userId: string, email: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (data) return;

  const rawBase = email.split('@')[0] || `user_${userId.slice(0, 8)}`;
  const base =
    rawBase
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24) || `user_${userId.slice(0, 8)}`;
  const candidates = [base, `${base}_${userId.slice(0, 6)}`];
  let lastError: string | null = null;

  for (const username of candidates) {
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username,
      full_name: username,
      created_at: new Date().toISOString(),
    });
    if (!error) return;
    lastError = error.message;
    const duplicateUsername = error.code === '23505' || error.message.toLowerCase().includes('duplicate');
    if (!duplicateUsername) break;
  }

  throw new Error(`ensureProfile: ${lastError ?? 'failed to create profile'}`);
}

export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: payload.fullName, bio: payload.bio })
    .eq('id', userId);
  if (error) throw new Error(`updateProfile: ${error.message}`);
  return fetchProfile(userId);
}

export async function completeOnboarding(
  userId: string,
  interests: string[],
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ interests, onboarded: true })
    .eq('id', userId);
  if (error) throw new Error(`completeOnboarding: ${error.message}`);
}

export async function saveBuildingStage(
  userId: string,
  stage: BuildingStage,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ building_stage: stage })
    .eq('id', userId);
  if (error) throw new Error(`saveBuildingStage: ${error.message}`);
}

export async function saveInterests(
  userId: string,
  interests: string[],
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', userId);
  if (error) throw new Error(`saveInterests: ${error.message}`);
}

export async function completeOnboardingFull(
  userId: string,
  connectStatus: ConnectStatus,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      connect_status: connectStatus,
      onboarding_completed: true,
      onboarded: true,
    })
    .eq('id', userId);
  if (error) throw new Error(`completeOnboardingFull: ${error.message}`);
}

export async function updateConnectStatus(
  userId: string,
  status: ConnectStatus,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ connect_status: status })
    .eq('id', userId);
  if (error) throw new Error(`updateConnectStatus: ${error.message}`);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(
  authorId: string,
  payload: CreatePostPayload,
): Promise<Post> {
  const { data: { session } } = await supabase.auth.getSession();
  assertEmailVerified(session);
  const { data: allowed } = await supabase.rpc('check_post_rate_limit', { p_user_id: authorId });
  if (allowed === false) throw new Error('You\'re posting too fast — wait a bit before publishing again.');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      type: payload.type,
      title: payload.title,
      excerpt: payload.excerpt,
      body: payload.body,
      cover_url: payload.coverUrl || null,
      milestone: payload.milestone ?? null,
      tags: payload.tags,
    })
    .select(POST_WITH_AUTHOR_SELECT)
    .single();
  if (error) throw new Error(`createPost: ${error.message}`);
  return toPost(data as Record<string, unknown>);
}

export async function updatePost(
  postId: string,
  authorId: string,
  payload: CreatePostPayload,
): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update({
      type: payload.type,
      title: payload.title,
      excerpt: payload.excerpt,
      body: payload.body,
      cover_url: payload.coverUrl,
      milestone: payload.milestone ?? null,
      tags: payload.tags,
    })
    .eq('id', postId)
    .eq('author_id', authorId)
    .select(POST_WITH_AUTHOR_SELECT)
    .single();
  if (error) throw new Error(`updatePost: ${error.message}`);
  return toPost(data as Record<string, unknown>);
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', authorId);
  if (error) throw new Error(`deletePost: ${error.message}`);
}

export async function incrementViewCount(postId: string): Promise<void> {
  await supabase.rpc('increment_view_count', { post_id: postId });
}

// ─── Storage ──────────────────────────────────────────────────────────────────

// ─── Inbox ────────────────────────────────────────────────────────────────────

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false });
  if (error) throw new Error(`fetchConversations: ${error.message}`);

  const conversations = (data ?? []) as Record<string, unknown>[];
  if (conversations.length === 0) return [];

  // Fetch the other participant's profile for each conversation
  const otherIds = conversations.map((c) => {
    const pids = c.participant_ids as string[];
    return pids.find((pid) => pid !== userId) ?? '';
  }).filter(Boolean);

  const uniqueOtherIds = [...new Set(otherIds)];
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .in('id', uniqueOtherIds);

  const profileMap: Record<string, Record<string, unknown>> = {};
  for (const p of profileData ?? []) {
    profileMap[String(p.id)] = p as Record<string, unknown>;
  }

  // Fetch last messages
  const convIds = conversations.map((c) => String(c.id));
  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  const lastMsgMap: Record<string, string> = {};
  for (const msg of lastMessages ?? []) {
    const cid = String(msg.conversation_id);
    if (!lastMsgMap[cid]) lastMsgMap[cid] = String(msg.body);
  }

  return conversations.map((c): Conversation => {
    const pids = c.participant_ids as string[];
    const otherId = pids.find((pid) => pid !== userId) ?? '';
    const otherRow = profileMap[otherId] ?? {};
    const fullName = String(otherRow.full_name ?? otherRow.username ?? 'Unknown');
    const username = String(otherRow.username ?? '');
    const initials =
      fullName.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2)
      || username.slice(0, 2).toUpperCase();

    return {
      id: String(c.id),
      participantIds: pids,
      contextPostId: (c.context_post_id as string | null) ?? null,
      createdAt: String(c.created_at),
      lastMessageAt: String(c.last_message_at),
      otherParticipant: {
        id: otherId,
        fullName,
        username,
        initials,
        avatarUrl: (otherRow.avatar_url as string | null) ?? null,
      },
      lastMessage: lastMsgMap[String(c.id)] ?? null,
      unreadCount: 0,
    };
  });
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`fetchMessages: ${error.message}`);
  return (data ?? []).map((r) => toMessage(r as Record<string, unknown>));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const { data: { session } } = await supabase.auth.getSession();
  assertEmailVerified(session);
  const { data: allowed } = await supabase.rpc('check_message_rate_limit', { p_user_id: senderId });
  if (allowed === false) throw new Error('Slow down — you\'re sending messages too quickly.');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select()
    .single();
  if (error) throw new Error(`sendMessage: ${error.message}`);
  return toMessage(data as Record<string, unknown>);
}

export async function startConversation(
  recipientId: string,
  firstMessage: string,
  contextPostId?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  assertEmailVerified(session);
  const { data: allowed } = await supabase.rpc('check_conversation_rate_limit', {
    p_user_id: session.user.id,
  });
  if (allowed === false) throw new Error('You\'ve started too many conversations today — try again tomorrow.');

  const { data, error } = await supabase.rpc('start_conversation', {
    recipient_id: recipientId,
    context_post_id: contextPostId ?? null,
    first_message: firstMessage,
  });
  if (error) throw new Error(`startConversation: ${error.message}`);
  return String(data);
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function uploadCover(
  userId: string,
  localUri: string,
  postId: string,
): Promise<string> {
  const rawExt = (localUri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const path = `${userId}/${postId}/cover.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from('covers').upload(path, arrayBuffer, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw new Error(`uploadCover: ${error.message}`);
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
}

// ─── Notifications ────────────────────────────────────────────────────────────

function toNotificationActor(
  row: Record<string, unknown>,
): Pick<Profile, 'id' | 'fullName' | 'username' | 'initials' | 'avatarUrl'> {
  const fullName = String(row.full_name ?? '');
  const username = String(row.username ?? '');
  const initials =
    fullName.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2)
    || username.slice(0, 2).toUpperCase();
  return {
    id: String(row.id),
    fullName,
    username,
    initials,
    avatarUrl: (row.avatar_url as string | null) ?? null,
  };
}

function toAppNotification(row: Record<string, unknown>): AppNotification {
  const actorRow = (row.actor as Record<string, unknown> | null) ?? null;
  const postRow = (row.post as Record<string, unknown> | null) ?? null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as NotificationType,
    actorId: (row.actor_id as string | null) ?? null,
    postId: (row.post_id as string | null) ?? null,
    conversationId: (row.conversation_id as string | null) ?? null,
    read: Boolean(row.read),
    createdAt: String(row.created_at ?? ''),
    actor: actorRow ? toNotificationActor(actorRow) : undefined,
    post: postRow
      ? {
          id: String(postRow.id),
          title: String(postRow.title),
          sparkedCount: postRow.sparked_count != null ? Number(postRow.sparked_count) : undefined,
        }
      : undefined,
  };
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(id, full_name, username, avatar_url), post:posts!post_id(id, title, sparked_count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`fetchNotifications: ${error.message}`);
  return (data ?? []).map((r) => toAppNotification(r as Record<string, unknown>));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw new Error(`markNotificationRead: ${error.message}`);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(`markAllNotificationsRead: ${error.message}`);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(`countUnreadNotifications: ${error.message}`);
  return count ?? 0;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) throw new Error(`savePushToken: ${error.message}`);
}

export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
  if (error) throw new Error(`clearPushToken: ${error.message}`);
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function createReport(
  reporterId: string,
  payload: CreateReportPayload,
): Promise<void> {
  if (!reporterId) throw new Error('Please sign in before reporting content.');
  const isPostReport = payload.targetType === 'post';
  const targetId = isPostReport ? payload.postId : payload.profileId;
  if (!targetId) throw new Error('Could not identify what to report.');
  if (!isPostReport && targetId === reporterId) {
    throw new Error('You cannot report your own profile.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user.id !== reporterId) {
    throw new Error('Session expired. Please sign in again.');
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_type: payload.targetType,
      post_id: isPostReport ? targetId : null,
      profile_id: isPostReport ? null : targetId,
      reason: payload.reason,
    });
  if (error) throw new Error(`createReport: ${error.message}`);
}

export async function sendBetaFeedback(userId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!userId) throw new Error('Please sign in before sending feedback.');
  if (trimmed.length < 5) throw new Error('Write a few words before sending.');
  if (trimmed.length > 2000) throw new Error('Feedback can be up to 2,000 characters.');

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user.id !== userId) {
    throw new Error('Session expired. Please sign in again.');
  }

  const { error } = await supabase
    .from('beta_feedback')
    .insert({ user_id: userId, body: trimmed });
  if (error) throw new Error(`sendBetaFeedback: ${error.message}`);
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) throw new Error(`deleteAccount: ${error.message}`);
}

export async function exportAccountData(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke<Record<string, unknown>>('export-data', {
    method: 'GET',
  });
  if (error) throw new Error(`exportAccountData: ${error.message}`);
  return data ?? {};
}
