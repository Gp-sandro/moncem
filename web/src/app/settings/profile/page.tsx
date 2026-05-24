import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProfileEditor } from '@/components/ProfileEditor';
import { StudentVerificationCard } from '@/components/StudentVerificationCard';
import { isUserEmailVerified } from '@/lib/auth';
import { maskEmail } from '@/lib/student-verification';
import type { BuildingStage, ConnectStatus, StudentStatus } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Edit profile',
};

type OwnProfileRow = {
  username: string | null;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  school: string | null;
  major: string | null;
  student_status: StudentStatus | null;
  current_project: string | null;
  accelerator: string | null;
  building_stage: BuildingStage | null;
  connect_status: ConnectStatus | null;
  interests: string[] | null;
  edu_email_verified: boolean | null;
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/join?next=/settings/profile');
  }

  if (!isUserEmailVerified(user)) {
    redirect('/verify-email?next=/settings/profile');
  }

  const { data, error } = await supabase.rpc('get_own_profile').maybeSingle();
  const profile = data as OwnProfileRow | null;

  if (error || !profile) {
    console.error('Own profile fetch failed', error);
    redirect('/feed');
  }

  const missingRequiredProfileSignals = !profile.school || !profile.current_project || profile.connect_status === 'closed';
  const checklist = [
    {
      label: 'Profile completion',
      done: !missingRequiredProfileSignals,
      href: '#profile-editor',
      detail: missingRequiredProfileSignals ? 'Add school, current project, and connect status.' : 'Ready for Schools and Connect.',
    },
    {
      label: 'Student verification',
      done: Boolean(profile.edu_email_verified),
      href: '#student-verification',
      detail: profile.edu_email_verified ? 'Academic email verified.' : 'Verify an academic email for the badge.',
    },
    {
      label: 'Password recovery',
      done: true,
      href: '/forgot-password',
      detail: 'Reset links are available for email accounts.',
    },
    {
      label: 'Privacy policy',
      done: true,
      href: '/privacy',
      detail: 'Review what Moncem collects before beta.',
    },
  ];

  return (
    <main className="settings-page">
      <section className="shell settings-hero">
        <div>
          <p className="eyebrow">Profile setup</p>
          <h1>Make your founder profile useful.</h1>
        </div>
        <p>
          Schools, Connect, and your profile all depend on this information. Keep it
          concrete so other student founders understand what you are building.
        </p>
      </section>
      {missingRequiredProfileSignals ? (
        <section className="shell completion-card">
          <p className="eyebrow">Profile strength</p>
          <h2>Add school, current project, and connect status before inviting beta users.</h2>
        </section>
      ) : null}
      <section className="shell account-checklist" aria-label="Account readiness checklist">
        <div>
          <p className="eyebrow">Account readiness</p>
          <h2>Baseline controls before beta.</h2>
        </div>
        <div className="checklist-grid">
          {checklist.map((item) => (
            <Link className={`checklist-item ${item.done ? 'done' : ''}`} href={item.href} key={item.label}>
              <span>{item.done ? 'Ready' : 'Needs work'}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </Link>
          ))}
          <form action="/auth/signout" method="post" className="checklist-item">
            <span>Session</span>
            <strong>Log out</strong>
            <small>End this browser session.</small>
            <button className="button secondary" type="submit">Log out</button>
          </form>
        </div>
      </section>
      <section className="shell" id="student-verification">
        <StudentVerificationCard
          email={maskEmail(user.email)}
          verified={Boolean(profile.edu_email_verified)}
        />
      </section>
      <section className="shell" id="profile-editor">
        <ProfileEditor profile={profile} />
      </section>
    </main>
  );
}
