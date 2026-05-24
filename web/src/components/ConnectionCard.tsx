import Link from 'next/link';
import { StartConversationButton } from '@/components/StartConversationButton';
import { formatStudentStatus, initialsFor } from '@/lib/format';
import type { PublicProfile } from '@/lib/types';

function connectLabel(status: PublicProfile['connectStatus']): string {
  if (status === 'limited') return 'Selective';
  if (status === 'open') return 'Open to connect';
  return 'Closed';
}

function openerFor(profile: PublicProfile): string {
  const firstInterest = profile.interests[0];
  if (profile.currentProject) return profile.currentProject;
  if (firstInterest) return `Ask about ${firstInterest.toLowerCase()} traction`;
  return 'Ask what they are building this week';
}

export function ConnectionCard({
  profile,
  currentUserId,
}: {
  profile: PublicProfile;
  currentUserId?: string | null;
}) {
  return (
    <article className="connection-card">
      <span className="avatar connection-avatar">{initialsFor(profile.fullName, profile.username)}</span>
      <div className="connection-person">
        <h2>{profile.fullName}</h2>
        <p className="connection-meta">
          {[
            profile.school,
            profile.major,
            formatStudentStatus(profile.studentStatus),
          ]
            .filter(Boolean)
            .join(' / ')}
        </p>
        <p className="connection-bio">
          {profile.currentProject ?? profile.bio ?? 'Building in public and open to useful founder conversations.'}
        </p>
        <div className="connection-pills">
          <span className="pill strong">{connectLabel(profile.connectStatus)}</span>
          {profile.interests.slice(0, 2).map((interest) => (
            <span className="pill" key={interest}>
              {interest}
            </span>
          ))}
          {profile.accelerator ? <span className="pill">{profile.accelerator}</span> : null}
        </div>
      </div>
      <div className="opener-card">
        <div>
          <span>Context</span>
          <strong>{openerFor(profile)}</strong>
        </div>
        <Link href={`/u/${profile.username}`} className="opener-link">
          View profile
        </Link>
        <StartConversationButton
          recipientId={profile.id}
          recipientName={profile.fullName}
          recipientStatus={profile.connectStatus}
          isOwnProfile={currentUserId === profile.id}
        />
      </div>
    </article>
  );
}
