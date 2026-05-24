import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/env';

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  const { supabaseUrl } = getSupabasePublicConfig();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
