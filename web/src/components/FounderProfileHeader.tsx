import { StartConversationButton } from '@/components/StartConversationButton';
import { formatStudentStatus, initialsFor } from '@/lib/format';
import type { PublicPost, PublicProfile } from '@/lib/types';

export function FounderProfileHeader({
  profile,
  posts,
  currentUserId,
  isAuthenticated = true,
}: {
  profile: PublicProfile;
  posts: PublicPost[];
  currentUserId?: string | null;
  isAuthenticated?: boolean;
}) {
  const proof = posts.filter((post) => post.milestone).length;

  return (
    <section className="panel profile-hero">
      <div>
        <div className="profile-top">
          <span className="avatar">{initialsFor(profile.fullName, profile.username)}</span>
          <div>
            <p className="eyebrow">Student founder</p>
            <h1 className="page-title">{profile.fullName}</h1>
            <p className="muted">
              @{profile.username}
              {profile.school ? ` / ${profile.school}` : ''}
            </p>
          </div>
        </div>
        <p className="section-copy">
          {profile.currentProject ?? profile.bio ?? 'Building in public on Moncem.'}
        </p>
        <div className="profile-pills">
          <span className="pill strong">{formatStudentStatus(profile.studentStatus)}</span>
          {profile.major ? <span className="pill">{profile.major}</span> : null}
          {profile.accelerator ? <span className="pill">{profile.accelerator}</span> : null}
          {profile.eduEmailVerified ? <span className="pill">Verified student</span> : null}
        </div>
        <div className="profile-connect-action">
          <StartConversationButton
            recipientId={profile.id}
            recipientName={profile.fullName}
            recipientStatus={profile.connectStatus}
            isOwnProfile={currentUserId === profile.id}
            isAuthenticated={isAuthenticated}
            joinNext={`/u/${profile.username}`}
          />
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <strong>{posts.length}</strong>
          <span>{posts.length === 1 ? 'Dispatch' : 'Dispatches'}</span>
        </div>
        <div className="stat">
          <strong>{proof}</strong>
          <span>Proof notes</span>
        </div>
      </div>
    </section>
  );
}
