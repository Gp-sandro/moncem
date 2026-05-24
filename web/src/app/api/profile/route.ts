import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import type { BuildingStage, ConnectStatus, StudentStatus } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const maxProfileRequestBytes = 8_000;
const studentStatuses = new Set<StudentStatus>([
  'high_school',
  'undergrad',
  'grad',
  'recently_graduated',
  'gap_year',
  'dropped_out',
]);
const buildingStages = new Set<BuildingStage>(['idea', 'mvp', 'launched', 'scaling']);
const connectStatuses = new Set<ConnectStatus>(['open', 'limited', 'closed']);

type ProfileBody = {
  username?: unknown;
  full_name?: unknown;
  bio?: unknown;
  location?: unknown;
  school?: unknown;
  major?: unknown;
  student_status?: unknown;
  current_project?: unknown;
  accelerator?: unknown;
  building_stage?: unknown;
  connect_status?: unknown;
  interests?: unknown;
};

function cleanRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return null;
  return username;
}

function cleanInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .filter((interest): interest is string => typeof interest === 'string')
      .map((interest) => interest.trim())
      .filter((interest) => /^[a-z0-9][a-z0-9 +#._-]{0,31}$/i.test(interest))
      .slice(0, 8),
  )];
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This profile request was blocked. Refresh the page and try again.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxProfileRequestBytes) {
    return jsonError('Profile request is too large.', 413);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before editing your profile.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before editing your profile.', 403);
  }

  let body: ProfileBody;
  try {
    body = (await request.json()) as ProfileBody;
  } catch {
    return jsonError('Invalid profile request.', 400);
  }

  const username = cleanUsername(body.username);
  const fullName = cleanRequiredText(body.full_name, 100);
  const bio = cleanOptionalText(body.bio, 300);
  const location = cleanOptionalText(body.location, 80);
  const school = cleanOptionalText(body.school, 120);
  const major = cleanOptionalText(body.major, 120);
  const currentProject = cleanOptionalText(body.current_project, 160);
  const accelerator = cleanOptionalText(body.accelerator, 120);
  const interests = cleanInterests(body.interests);
  const studentStatus = typeof body.student_status === 'string' && studentStatuses.has(body.student_status as StudentStatus)
    ? body.student_status
    : null;
  const buildingStage = typeof body.building_stage === 'string' && buildingStages.has(body.building_stage as BuildingStage)
    ? body.building_stage
    : null;
  const connectStatus = typeof body.connect_status === 'string' && connectStatuses.has(body.connect_status as ConnectStatus)
    ? body.connect_status
    : 'closed';

  if (!username) {
    return jsonError('Use a username with 3-30 lowercase letters, numbers, or underscores.', 400);
  }

  if (!fullName) {
    return jsonError('Full name is required.', 400);
  }

  const { data: existingUsername, error: usernameError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle();

  if (usernameError) {
    console.error('Username check failed', usernameError);
    return jsonError('Could not verify username availability.', 400);
  }

  if (existingUsername) {
    return jsonError('That username is already taken.', 409);
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      username,
      full_name: fullName,
      bio,
      location,
      school,
      major,
      student_status: studentStatus,
      current_project: currentProject,
      accelerator,
      building_stage: buildingStage,
      connect_status: connectStatus,
      interests,
      onboarded: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('Profile update failed', error);
    return jsonError('Could not save your profile. Check your fields and try again.', 400);
  }

  return NextResponse.json(
    { ok: true, username },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
