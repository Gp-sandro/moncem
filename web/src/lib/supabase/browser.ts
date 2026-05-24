import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from '@/lib/env';

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
