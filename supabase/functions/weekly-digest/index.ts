// Weekly digest Edge Function — runs on a Supabase cron schedule.
//
// For each user with a push_token, count posts in their interest tags from the
// last 7 days. If the count is > 0, send an Expo push and insert a
// weekly_digest notification row. If the count is 0, skip (no ghost towns).
//
// Cron setup (Supabase dashboard → Database → Cron):
//   SELECT cron.schedule(
//     'weekly-digest',
//     '0 10 * * 0',  -- Sunday 10:00 UTC
//     $$
//       SELECT net.http_post(
//         url := 'https://rczpruplerhxedetjdvn.supabase.co/functions/v1/weekly-digest',
//         headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
//       );
//     $$
//   );
//
// Deploy:  supabase functions deploy weekly-digest --no-verify-jwt
// Secrets: supabase secrets set EXPO_ACCESS_TOKEN=... (optional, only for higher rate limits)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ProfileRow {
  id: string;
  push_token: string | null;
  interests: string[] | null;
}

async function sendExpoPush(token: string, title: string, body: string, data: Record<string, unknown>): Promise<void> {
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: token, title, body, data, sound: null }),
  }).catch(() => {});
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, push_token, interests')
    .not('push_token', 'is', null);

  if (error || !profiles) {
    return new Response(JSON.stringify({ ok: false, error: error?.message }), { status: 500 });
  }

  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let sent = 0;

  for (const p of profiles as ProfileRow[]) {
    if (!p.push_token || !p.interests?.length) continue;

    const primary = p.interests[0];
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff)
      .contains('tags', [primary]);

    if (!count || count === 0) continue;

    const body = `${count} new ${count === 1 ? 'story' : 'stories'} in ${primary} this week — your interests are active`;

    await supabase.from('notifications').insert({
      user_id: p.id,
      type: 'weekly_digest',
    });

    await sendExpoPush(p.push_token, 'Your weekly digest', body, { kind: 'weekly_digest' });
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
