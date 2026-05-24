import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Private Moncem beta analytics dashboard.',
  robots: {
    index: false,
    follow: false,
  },
};

type AnalyticsEventRow = {
  id: string;
  event_name: string;
  path: string | null;
  referrer: string | null;
  anon_id: string | null;
  session_id: string | null;
  user_id: string | null;
  duration_ms: number | null;
  properties: Record<string, unknown> | null;
  created_at: string;
};

type Metric = {
  label: string;
  value: string;
  note: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: value >= 10_000 ? 'compact' : 'standard' }).format(value);
}

function percent(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function normalizePath(path: string | null): string {
  if (!path) return '/unknown';
  return path.split('?')[0] || '/';
}

function countBy<T extends string>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

function topCounts(counts: Map<string, number>, limit = 8): Array<{ label: string; value: number }> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function uniqueCount(values: Array<string | null>): number {
  return new Set(values.filter(Boolean)).size;
}

function recentLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'now';
  if (diff < 60 * 60_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < dayMs) return `${Math.round(diff / (60 * 60_000))}h ago`;
  return `${Math.round(diff / dayMs)}d ago`;
}

function buildFunnel(events: AnalyticsEventRow[]) {
  const pageViews = events.filter((event) => event.event_name === 'page_view');
  const signupViews = pageViews.filter((event) => normalizePath(event.path) === '/signup').length;
  const signupSubmits = events.filter((event) => event.event_name === 'auth_signup_submit').length;
  const authSuccesses = events.filter((event) => event.event_name === 'auth_success').length;
  const profileSaves = events.filter((event) => event.event_name === 'profile_save_success').length;
  const postPublishes = events.filter((event) => event.event_name === 'post_publish_success').length;
  const conversations = events.filter((event) => event.event_name === 'conversation_start_success').length;

  return [
    { label: 'Signup views', value: signupViews },
    { label: 'Signup submits', value: signupSubmits },
    { label: 'Verified auths', value: authSuccesses },
    { label: 'Profiles saved', value: profileSaves },
    { label: 'Posts published', value: postPublishes },
    { label: 'Conversations', value: conversations },
  ];
}

function averageTimeByPath(events: AnalyticsEventRow[]) {
  const totals = new Map<string, { total: number; count: number }>();
  for (const event of events) {
    if (event.event_name !== 'time_on_page' || !event.duration_ms) continue;
    const path = normalizePath(event.path);
    const current = totals.get(path) ?? { total: 0, count: 0 };
    current.total += event.duration_ms;
    current.count += 1;
    totals.set(path, current);
  }

  return [...totals.entries()]
    .map(([label, item]) => ({ label, value: Math.round(item.total / item.count) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function BarList({
  items,
  formatter = compactNumber,
}: {
  items: Array<{ label: string; value: number }>;
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return <p className="analytics-empty">No events yet.</p>;
  }

  return (
    <div className="analytics-bars">
      {items.map((item) => (
        <div className="analytics-bar-row" key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{formatter(item.value)}</strong>
          </div>
          <i style={{ width: `${Math.max(7, (item.value / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/analytics');
  }

  const allowedEmails = adminEmails();
  const userEmail = user.email?.toLowerCase() ?? '';
  if (!allowedEmails.size || !allowedEmails.has(userEmail)) {
    redirect('/feed');
  }

  const admin = createAdminClient();
  if (!admin) {
    return (
      <main className="analytics-page">
        <section className="shell analytics-setup">
          <p className="eyebrow">Private dashboard</p>
          <h1>Analytics needs one server key.</h1>
          <p>
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to Vercel and local env, then redeploy.
            The dashboard only reads events on the server and never exposes this key to the browser.
          </p>
        </section>
      </main>
    );
  }

  const since = new Date(Date.now() - 30 * dayMs).toISOString();
  const { data, error } = await admin
    .from('web_analytics_events')
    .select('id,event_name,path,referrer,anon_id,session_id,user_id,duration_ms,properties,created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3000);

  if (error) {
    return (
      <main className="analytics-page">
        <section className="shell analytics-setup">
          <p className="eyebrow">Private dashboard</p>
          <h1>Analytics could not load.</h1>
          <p>{error.message}</p>
        </section>
      </main>
    );
  }

  const events = (data ?? []) as AnalyticsEventRow[];
  const pageViews = events.filter((event) => event.event_name === 'page_view');
  const sessions = uniqueCount(events.map((event) => event.session_id));
  const visitors = uniqueCount(events.map((event) => event.anon_id));
  const signedInUsers = uniqueCount(events.map((event) => event.user_id));
  const avgTime = averageTimeByPath(events);
  const avgTimeTotal = avgTime.length
    ? Math.round(avgTime.reduce((sum, item) => sum + item.value, 0) / avgTime.length)
    : 0;
  const eventCounts = topCounts(countBy(events.map((event) => event.event_name)), 12);
  const topPages = topCounts(countBy(pageViews.map((event) => normalizePath(event.path))), 8);
  const funnel = buildFunnel(events);
  const maxFunnel = Math.max(funnel[0]?.value ?? 0, 1);
  const metrics: Metric[] = [
    { label: 'Visitors', value: compactNumber(visitors), note: `${compactNumber(sessions)} sessions` },
    { label: 'Page views', value: compactNumber(pageViews.length), note: 'Last 30 days' },
    { label: 'Known users', value: compactNumber(signedInUsers), note: 'Authenticated activity' },
    { label: 'Avg engaged time', value: formatDuration(avgTimeTotal), note: 'Across tracked pages' },
    {
      label: 'Signup conversion',
      value: percent(
        events.filter((event) => event.event_name === 'auth_success').length,
        Math.max(events.filter((event) => event.event_name === 'auth_signup_submit').length, 0),
      ),
      note: 'Submit to confirmed auth',
    },
    {
      label: 'Founder actions',
      value: compactNumber(
        events.filter((event) => (
          event.event_name === 'post_publish_success'
          || event.event_name === 'conversation_start_success'
          || event.event_name === 'reaction_toggle'
        )).length,
      ),
      note: 'Posts, connects, reactions',
    },
  ];

  return (
    <main className="analytics-page">
      <section className="shell analytics-hero">
        <div>
          <p className="eyebrow">Private beta analytics</p>
          <h1>Where students move, stall, and start building.</h1>
          <p>
            First-party product signals from the last 30 days. No raw emails, no message bodies,
            no post bodies, and no public client read access.
          </p>
        </div>
        <div className="analytics-snapshot">
          <strong>{compactNumber(events.length)}</strong>
          <span>events captured</span>
          <small>Use this to tune onboarding, profile completion, and the first-post loop.</small>
        </div>
      </section>

      <section className="shell analytics-metrics" aria-label="Analytics metrics">
        {metrics.map((metric) => (
          <article className="analytics-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="shell analytics-grid">
        <article className="analytics-panel analytics-funnel">
          <div className="analytics-panel-head">
            <p className="eyebrow">Conversion path</p>
            <h2>Visit to founder action</h2>
          </div>
          <div className="funnel-list">
            {funnel.map((step) => (
              <div className="funnel-step" key={step.label}>
                <span>{step.label}</span>
                <strong>{compactNumber(step.value)}</strong>
                <i style={{ width: `${Math.max(5, (step.value / maxFunnel) * 100)}%` }} />
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-head">
            <p className="eyebrow">Pages</p>
            <h2>Most viewed routes</h2>
          </div>
          <BarList items={topPages} />
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-head">
            <p className="eyebrow">Attention</p>
            <h2>Time by page</h2>
          </div>
          <BarList items={avgTime} formatter={formatDuration} />
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-head">
            <p className="eyebrow">Events</p>
            <h2>What users are doing</h2>
          </div>
          <BarList items={eventCounts} />
        </article>
      </section>

      <section className="shell analytics-panel analytics-table-panel">
        <div className="analytics-panel-head">
          <p className="eyebrow">Live pulse</p>
          <h2>Recent activity</h2>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Path</th>
                <th>User</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 18).map((event) => (
                <tr key={event.id}>
                  <td>{event.event_name.replaceAll('_', ' ')}</td>
                  <td>{event.path ?? '-'}</td>
                  <td>{event.user_id ? 'signed in' : 'anonymous'}</td>
                  <td>{recentLabel(event.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
