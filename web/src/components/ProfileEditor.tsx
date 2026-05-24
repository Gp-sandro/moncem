'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trackClientEvent } from '@/lib/analytics-client';
import type { BuildingStage, ConnectStatus, StudentStatus } from '@/lib/types';

type OwnProfile = {
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
};

type ProfileUpdateResult = {
  ok?: boolean;
  username?: string;
  error?: string;
};

function valueOrEmpty(value: string | null | undefined): string {
  return value ?? '';
}

export function ProfileEditor({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(valueOrEmpty(profile.full_name));
  const [username, setUsername] = useState(valueOrEmpty(profile.username));
  const [bio, setBio] = useState(valueOrEmpty(profile.bio));
  const [location, setLocation] = useState(valueOrEmpty(profile.location));
  const [school, setSchool] = useState(valueOrEmpty(profile.school));
  const [major, setMajor] = useState(valueOrEmpty(profile.major));
  const [studentStatus, setStudentStatus] = useState<StudentStatus | ''>(profile.student_status ?? '');
  const [currentProject, setCurrentProject] = useState(valueOrEmpty(profile.current_project));
  const [accelerator, setAccelerator] = useState(valueOrEmpty(profile.accelerator));
  const [buildingStage, setBuildingStage] = useState<BuildingStage | ''>(profile.building_stage ?? '');
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(profile.connect_status ?? 'closed');
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '));

  const interestList = useMemo(
    () => interests
      .split(',')
      .map((interest) => interest.trim())
      .filter(Boolean)
      .slice(0, 8),
    [interests],
  );
  const canSave = fullName.trim().length > 0 && username.trim().length > 0 && !saving;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSave) {
      setError('Name and username are required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          bio,
          location,
          school,
          major,
          student_status: studentStatus || null,
          current_project: currentProject,
          accelerator,
          building_stage: buildingStage || null,
          connect_status: connectStatus,
          interests: interestList,
        }),
      });
      const result = (await response.json().catch(() => null)) as ProfileUpdateResult | null;

      if (!response.ok || !result?.ok || !result.username) {
        setError(result?.error ?? 'Could not save your profile. Try again.');
        setSaving(false);
        return;
      }

      trackClientEvent('profile_save_success', {
        has_school: Boolean(school.trim()),
        has_project: Boolean(currentProject.trim()),
        connect_status: connectStatus,
        interest_count: interestList.length,
      });
      router.push(`/u/${result.username}`);
      router.refresh();
    } catch {
      setError('Could not reach the profile server. Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}

      <section className="settings-section">
        <p className="eyebrow">Identity</p>
        <div className="settings-grid">
          <label>
            Full name
            <input maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label>
            Username
            <input
              maxLength={30}
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              required
            />
          </label>
          <label>
            Location
            <input maxLength={80} value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <label>
            Bio
            <textarea maxLength={300} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <p className="eyebrow">Student signal</p>
        <div className="settings-grid">
          <label>
            School
            <input maxLength={120} value={school} onChange={(event) => setSchool(event.target.value)} />
          </label>
          <label>
            Major
            <input maxLength={120} value={major} onChange={(event) => setMajor(event.target.value)} />
          </label>
          <label>
            Student status
            <select value={studentStatus} onChange={(event) => setStudentStatus(event.target.value as StudentStatus | '')}>
              <option value="">Select one</option>
              <option value="high_school">High school</option>
              <option value="undergrad">Undergrad</option>
              <option value="grad">Grad student</option>
              <option value="recently_graduated">Recently graduated</option>
              <option value="gap_year">Gap year</option>
              <option value="dropped_out">Dropped out</option>
            </select>
          </label>
          <label>
            Accelerator
            <input maxLength={120} value={accelerator} onChange={(event) => setAccelerator(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <p className="eyebrow">What you are building</p>
        <div className="settings-grid">
          <label>
            Current project
            <input
              maxLength={160}
              value={currentProject}
              onChange={(event) => setCurrentProject(event.target.value)}
              placeholder="One line about what you are building"
            />
          </label>
          <label>
            Building stage
            <select value={buildingStage} onChange={(event) => setBuildingStage(event.target.value as BuildingStage | '')}>
              <option value="">Select one</option>
              <option value="idea">Idea</option>
              <option value="mvp">MVP</option>
              <option value="launched">Launched</option>
              <option value="scaling">Scaling</option>
            </select>
          </label>
          <label>
            Connect status
            <select value={connectStatus} onChange={(event) => setConnectStatus(event.target.value as ConnectStatus)}>
              <option value="closed">Closed</option>
              <option value="limited">Selective</option>
              <option value="open">Open to connect</option>
            </select>
          </label>
          <label>
            Interests
            <input
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              placeholder="AI, SaaS, Climate"
            />
          </label>
        </div>
      </section>

      <div className="settings-submit">
        <div>
          <strong>{interestList.length}/8 interests</strong>
          <span>Completing this powers Schools, Connect, and your public profile.</span>
        </div>
        <button className="button venture" type="submit" disabled={!canSave}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
