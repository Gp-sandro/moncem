-- Make auth-trigger profile creation deterministic for email, Google, and Apple signups.
-- Web signup now sends full_name, preferred_username, school, and current_project
-- through auth metadata; this trigger stores the safe subset on public.profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user_with_social()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  generated_username text;
  resolved_name text;
  resolved_avatar text;
  provider_name text;
  resolved_school text;
  resolved_current_project text;
  resolved_student_status text;
BEGIN
  provider_name := coalesce(NEW.raw_app_meta_data->>'provider', '');

  base_username := coalesce(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(coalesce(NEW.email, ''), '@', 1),
    'builder'
  );
  generated_username := public.generate_unique_username(base_username);

  resolved_name := nullif(left(coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    nullif(trim(concat(
      coalesce(NEW.raw_user_meta_data->>'given_name', ''),
      ' ',
      coalesce(NEW.raw_user_meta_data->>'family_name', '')
    )), ''),
    generated_username
  ), 100), '');

  resolved_avatar := coalesce(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  resolved_school := nullif(left(trim(coalesce(NEW.raw_user_meta_data->>'school', '')), 120), '');
  resolved_current_project := nullif(left(trim(coalesce(NEW.raw_user_meta_data->>'current_project', '')), 160), '');
  resolved_student_status := nullif(trim(coalesce(NEW.raw_user_meta_data->>'student_status', '')), '');

  IF resolved_student_status IS NOT NULL AND resolved_student_status NOT IN (
    'high_school',
    'undergrad',
    'grad',
    'recently_graduated',
    'gap_year',
    'dropped_out'
  ) THEN
    resolved_student_status := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    email_verified,
    school,
    current_project,
    student_status
  ) VALUES (
    NEW.id,
    generated_username,
    coalesce(resolved_name, generated_username),
    resolved_avatar,
    CASE
      WHEN provider_name IN ('google', 'apple') THEN true
      WHEN NEW.email_confirmed_at IS NOT NULL THEN true
      ELSE false
    END,
    resolved_school,
    resolved_current_project,
    resolved_student_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = EXCLUDED.email_verified,
    avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url),
    full_name = coalesce(nullif(public.profiles.full_name, ''), EXCLUDED.full_name),
    school = coalesce(public.profiles.school, EXCLUDED.school),
    current_project = coalesce(public.profiles.current_project, EXCLUDED.current_project),
    student_status = coalesce(public.profiles.student_status, EXCLUDED.student_status);

  RETURN NEW;
END;
$$;
