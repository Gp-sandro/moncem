import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { createClient } from '@/lib/supabase/server';

type AnalyticsBody = {
  eventName?: unknown;
  anonId?: unknown;
  sessionId?: unknown;
  path?: unknown;
  referrer?: unknown;
  durationMs?: unknown;
  properties?: unknown;
};

const maxAnalyticsRequestBytes = 8_000;
const allowedEvents = new Set([
  'page_view',
  'session_start',
  'time_on_page',
  'auth_login_view',
  'auth_signup_view',
  'auth_login_submit',
  'auth_signup_submit',
  'auth_google_start',
  'auth_success',
  'auth_email_confirmation_required',
  'auth_error',
  'profile_save_success',
  'student_verification_success',
  'student_verification_failed',
  'post_publish_success',
  'reaction_toggle',
  'conversation_start_success',
  'message_send_success',
]);

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), 24 * 60 * 60 * 1000);
}

function cleanProperties(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_]{1,50}$/.test(key)) continue;
    if (typeof raw === 'string') safe[key] = raw.slice(0, 160);
    else if (typeof raw === 'number' && Number.isFinite(raw)) safe[key] = raw;
    else if (typeof raw === 'boolean' || raw === null) safe[key] = raw;
  }

  return safe;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('Analytics request blocked.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxAnalyticsRequestBytes) {
    return jsonError('Analytics request is too large.', 413);
  }

  let body: AnalyticsBody;
  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return jsonError('Invalid analytics request.', 400);
  }

  const eventName = cleanString(body.eventName, 80);
  if (!eventName || !allowedEvents.has(eventName)) {
    return jsonError('Unknown analytics event.', 400);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('web_analytics_events').insert({
    user_id: user?.id ?? null,
    anon_id: cleanString(body.anonId, 80),
    session_id: cleanString(body.sessionId, 80),
    event_name: eventName,
    path: cleanString(body.path, 500),
    referrer: cleanString(body.referrer, 500),
    user_agent: cleanString(request.headers.get('user-agent'), 300),
    duration_ms: cleanDuration(body.durationMs),
    properties: cleanProperties(body.properties),
  });

  if (error) {
    console.error('Analytics insert failed', error);
    return jsonError('Analytics event not saved.', 400);
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
