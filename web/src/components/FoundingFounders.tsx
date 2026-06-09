import Link from 'next/link';
import { initialsFor } from '@/lib/format';
import type { PublicProfile } from '@/lib/types';

// A horizontal strip of the real founders building here — names and one-liners,
// never a count. With fewer than three people we drop any framing that would
// imply scale and just name who is here.
export function FoundingFounders({ profiles }: { profiles: PublicProfile[] }) {
  if (profiles.length === 0) return null;

  const lowCount = profiles.length < 3;

  return (
    <section className="shell section founding-founders" aria-label="Founding founders">
      <p className="eyebrow">{lowCount ? 'Building here' : 'Founding founders'}</p>
      <div className="founding-strip">
        {profiles.map((profile) => {
          const oneLiner = profile.currentProject ?? profile.bio ?? null;
          return (
            <Link key={profile.id} href={`/u/${profile.username}`} className="founding-card">
              <span className="avatar">{initialsFor(profile.fullName, profile.username)}</span>
              <strong>{profile.fullName}</strong>
              {oneLiner ? <span className="founding-oneliner">{oneLiner}</span> : null}
              {profile.school ? <span className="founding-school">{profile.school}</span> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
