import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationSummary, Message, PublicProfile, ReactionType } from '@/lib/types';

type ProfileRow = {
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

type ConversationRow = {
  id: string;
  participant_ids: string[];
  context_post_id: string | null;
  created_at: string;
  last_message_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ContextPostRow = {
  id: string;
  title: string;
  slug: string | null;
};

function isReactionType(value: string): value is ReactionType {
  return value === 'sparked' || value === 'validated' || value === 'inthis';
}

function mapProfile(row: ProfileRow): PublicProfile {
  const username = row.username ?? 'student-founder';
  return {
    id: row.id,
    username,
    fullName: row.full_name ?? username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    connectStatus: row.connect_status === 'open' || row.connect_status === 'limited' ? row.connect_status : 'closed',
    buildingStage:
      row.building_stage === 'idea' ||
      row.building_stage === 'mvp' ||
      row.building_stage === 'launched' ||
      row.building_stage === 'scaling'
        ? row.building_stage
        : null,
    interests: row.interests ?? [],
    school: row.school,
    major: row.major,
    studentStatus:
      row.student_status === 'high_school' ||
      row.student_status === 'undergrad' ||
      row.student_status === 'grad' ||
      row.student_status === 'recently_graduated' ||
      row.student_status === 'gap_year' ||
      row.student_status === 'dropped_out'
        ? row.student_status
        : null,
    currentProject: row.current_project,
    accelerator: row.accelerator,
    eduEmailVerified: Boolean(row.edu_email_verified),
    createdAt: row.created_at,
  };
}

export async function getActiveReactions(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  postIds: string[],
): Promise<Record<string, ReactionType[]>> {
  const uniquePostIds = [...new Set(postIds)].filter(Boolean);
  if (!userId || uniquePostIds.length === 0) return {};

  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, type')
    .eq('user_id', userId)
    .in('post_id', uniquePostIds);

  if (error) {
    console.error('Active reactions fetch failed', error);
    return {};
  }

  const byPost: Record<string, ReactionType[]> = {};
  for (const row of (data ?? []) as Array<{ post_id: string; type: string }>) {
    if (!isReactionType(row.type)) continue;
    byPost[row.post_id] = [...(byPost[row.post_id] ?? []), row.type];
  }
  return byPost;
}

export async function getConversationSummaries(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationSummary[]> {
  const { data: conversationData, error } = await supabase
    .from('conversations')
    .select('id, participant_ids, context_post_id, created_at, last_message_at')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false });

  if (error) throw new Error(`getConversationSummaries: ${error.message}`);

  const conversations = (conversationData ?? []) as ConversationRow[];
  if (conversations.length === 0) return [];

  const otherIds = [...new Set(conversations.flatMap((conversation) => (
    conversation.participant_ids.filter((id) => id !== userId)
  )))];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const contextPostIds = [...new Set(conversations.map((conversation) => conversation.context_post_id).filter(Boolean))] as string[];

  const [profilesResult, messagesResult, postsResult] = await Promise.all([
    otherIds.length > 0
      ? supabase.from('public_profiles_web').select('*').in('id', otherIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false }),
    contextPostIds.length > 0
      ? supabase.from('posts').select('id, title, slug').in('id', contextPostIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) throw new Error(`getConversationProfiles: ${profilesResult.error.message}`);
  if (messagesResult.error) throw new Error(`getConversationMessages: ${messagesResult.error.message}`);
  if (postsResult.error) throw new Error(`getConversationPosts: ${postsResult.error.message}`);

  const profiles = new Map<string, PublicProfile>();
  for (const row of (profilesResult.data ?? []) as ProfileRow[]) {
    profiles.set(row.id, mapProfile(row));
  }

  const lastMessages = new Map<string, MessageRow>();
  for (const row of (messagesResult.data ?? []) as MessageRow[]) {
    if (!lastMessages.has(row.conversation_id)) lastMessages.set(row.conversation_id, row);
  }

  const posts = new Map<string, ContextPostRow>();
  for (const row of (postsResult.data ?? []) as ContextPostRow[]) {
    posts.set(row.id, row);
  }

  return conversations.flatMap((conversation) => {
    const otherId = conversation.participant_ids.find((id) => id !== userId);
    const otherParticipant = otherId ? profiles.get(otherId) : null;
    if (!otherParticipant) return [];
    const contextPost = conversation.context_post_id ? posts.get(conversation.context_post_id) : null;
    const lastMessage = lastMessages.get(conversation.id) ?? null;

    return [{
      id: conversation.id,
      participantIds: conversation.participant_ids,
      contextPost: contextPost
        ? {
            id: contextPost.id,
            title: contextPost.title,
            slug: contextPost.slug ?? contextPost.id,
          }
        : null,
      otherParticipant,
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            createdAt: lastMessage.created_at,
            senderId: lastMessage.sender_id,
          }
        : null,
      createdAt: conversation.created_at,
      lastMessageAt: conversation.last_message_at,
    }];
  });
}

export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`getConversationMessages: ${error.message}`);

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}
