import Link from 'next/link';
import { formatStudentStatus, initialsFor } from '@/lib/format';
import type { PublicProfile } from '@/lib/types';

export function FounderRow({ profile }: { profile: PublicProfile }) {
  return (
    <Link href={`/u/${profile.username}`} className="founder-row">
      <span className="avatar avatar-small">{initialsFor(profile.fullName, profile.username)}</span>
      <span className="founder-row-copy">
        <strong>{profile.fullName}</strong>
        <span>
          {[
            profile.currentProject ?? profile.bio ?? formatStudentStatus(profile.studentStatus),
            profile.school,
          ]
            .filter(Boolean)
            .join(' / ')}
        </span>
      </span>
      <span className="founder-row-arrow">-&gt;</span>
    </Link>
  );
}
