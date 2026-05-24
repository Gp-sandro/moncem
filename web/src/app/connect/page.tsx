import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ConnectionCard } from '@/components/ConnectionCard';
import { isUserEmailVerified } from '@/lib/auth';
import { getConnectableProfiles, getFeaturedProfiles, getSchoolSummaries } from '@/lib/data';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

type ConnectSearchParams = {
  status?: string;
  interest?: string;
  school?: string;
};

type Props = {
  searchParams: Promise<ConnectSearchParams>;
};

export const metadata = {
  title: 'Connect with student founders',
  description: 'Find student founders open to useful profile-first conversations.',
};

export const dynamic = 'force-dynamic';

export default async function ConnectPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/join?next=/connect');
  }
  if (!isUserEmailVerified(user)) {
    redirect('/verify-email?next=/connect');
  }

  const params = await searchParams;
  const status = params.status === 'open' || params.status === 'limited' ? params.status : undefined;
  const interest = params.interest ? decodeURIComponent(params.interest) : undefined;
  const school = params.school ? decodeURIComponent(params.school) : undefined;
  const [connectableProfiles, featuredProfiles, schools] = await Promise.all([
    safeArray(getConnectableProfiles({ status, interest, school, limit: 12 })),
    safeArray(getFeaturedProfiles(5)),
    safeArray(getSchoolSummaries()),
  ]);
  const profiles = connectableProfiles;
  const topInterests = [...new Set(featuredProfiles.flatMap((profile) => profile.interests))].slice(0, 4);

  return (
    <main className="discovery-page">
      <section className="shell discovery-hero">
        <div>
          <p className="eyebrow">Connections</p>
          <h1 className="discovery-title">
            Start conversations with context.
          </h1>
          <p className="lead">
            Connect should never feel like a cold directory. Every card shows intent,
            proof, and the cleanest reason to open the founder profile.
          </p>
        </div>
        <aside className="pulse-card">
          <div>
            <p className="eyebrow">Open this week</p>
            <strong>{connectableProfiles.length}</strong>
          </div>
          <p>student founders are open or selective for useful conversations.</p>
        </aside>
      </section>

      <section className="shell filter-row" aria-label="Connection filters">
        <Link className={`filter-chip ${!status && !interest && !school ? 'active' : ''}`} href="/connect">All open</Link>
        <Link className={`filter-chip ${status === 'open' ? 'active' : ''}`} href="/connect?status=open">Open</Link>
        <Link className={`filter-chip ${status === 'limited' ? 'active' : ''}`} href="/connect?status=limited">Selective</Link>
        {topInterests.map((item) => (
          <Link
            key={item}
            className={`filter-chip ${interest === item ? 'active' : ''}`}
            href={`/connect?interest=${encodeURIComponent(item)}`}
          >
            {item}
          </Link>
        ))}
        {schools[0] ? (
          <Link
            className={`filter-chip ${school === schools[0].school ? 'active' : ''}`}
            href={`/connect?school=${encodeURIComponent(schools[0].school)}`}
          >
            {schools[0].school}
          </Link>
        ) : null}
      </section>

      <section className="shell connect-layout section">
        <div className="connection-list">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <ConnectionCard key={profile.id} profile={profile} currentUserId={user.id} />
            ))
          ) : (
            <div className="empty empty-action">
              <div>
                <p className="eyebrow">No matching founders</p>
                <p>No open student founders match these filters yet.</p>
                <Link href="/connect" className="button secondary">
                  Clear filters
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
