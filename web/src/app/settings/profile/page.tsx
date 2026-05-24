import { redirect } from 'next/navigation';
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
      <section className="shell">
        <StudentVerificationCard
          email={maskEmail(user.email)}
          verified={Boolean(profile.edu_email_verified)}
        />
      </section>
      <section className="shell">
        <ProfileEditor profile={profile} />
      </section>
    </main>
  );
}
