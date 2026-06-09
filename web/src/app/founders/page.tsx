import type { Metadata } from 'next';
import { FounderRow } from '@/components/FounderRow';
import { getMembers } from '@/lib/data';
import { safeArray } from '@/lib/safe-data';

export const metadata: Metadata = {
  title: 'Founders',
  description: 'The student founders building in public on Moncem.',
};

export const dynamic = 'force-dynamic';

export default async function FoundersPage() {
  const members = await safeArray(getMembers(60));

  return (
    <main className="discovery-page">
      <section className="shell compact-page-header">
        <div>
          <h1>Founders</h1>
          <p>The student founders building in public here.</p>
        </div>
      </section>

      <section className="shell section">
        {members.length > 0 ? (
          <div className="founder-list founder-list-wide">
            {members.map((profile) => (
              <FounderRow key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div>
              <p className="eyebrow">Early days</p>
              <p>Nothing here yet. That&apos;s the point — be early.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
