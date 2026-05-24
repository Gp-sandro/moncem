import Link from 'next/link';
import { formatStudentStatus, initialsFor } from '@/lib/format';
import type { PublicProfile } from '@/lib/types';

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  return (
    <Link href={`/u/${profile.username}`} className="profile-card">
      <div className="profile-top">
        <span className="avatar">{initialsFor(profile.fullName, profile.username)}</span>
        <div>
          <h2>{profile.fullName}</h2>
          <span className="muted">@{profile.username}</span>
        </div>
      </div>
      <p>{profile.currentProject ?? profile.bio ?? 'Building something early and worth following.'}</p>
      <div className="profile-pills">
        {profile.school ? <span className="pill strong">{profile.school}</span> : null}
        <span className="pill">{formatStudentStatus(profile.studentStatus)}</span>
        {profile.accelerator ? <span className="pill">{profile.accelerator}</span> : null}
      </div>
    </Link>
  );
}
