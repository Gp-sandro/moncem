import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const jsonHeaders = {
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const userId = user.id;

  const [
    profile,
    posts,
    reactions,
    conversations,
    sentMessages,
    notifications,
    reports,
    betaFeedback,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('posts').select('*').eq('author_id', userId).order('created_at'),
    supabase.from('reactions').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('conversations').select('*').contains('participant_ids', [userId]).order('created_at'),
    supabase.from('messages').select('*').eq('sender_id', userId).order('created_at'),
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('reports').select('*').eq('reporter_id', userId).order('created_at'),
    supabase.from('beta_feedback').select('*').eq('user_id', userId).order('created_at'),
  ]);

  const firstError = [
    profile.error,
    posts.error,
    reactions.error,
    conversations.error,
    sentMessages.error,
    notifications.error,
    reports.error,
    betaFeedback.error,
  ].find(Boolean);

  if (firstError) {
    return new Response(JSON.stringify({ error: firstError.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const exportBody = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile.data,
    posts: posts.data ?? [],
    reactions_given: reactions.data ?? [],
    conversations: conversations.data ?? [],
    messages_sent: sentMessages.data ?? [],
    notifications_received: notifications.data ?? [],
    reports_filed: reports.data ?? [],
    beta_feedback: betaFeedback.data ?? [],
  };

  return new Response(JSON.stringify(exportBody, null, 2), {
    status: 200,
    headers: {
      ...jsonHeaders,
      'Content-Disposition': `attachment; filename="moncem-data-${userId}.json"`,
    },
  });
});
