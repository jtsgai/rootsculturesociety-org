import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isStudioConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!isStudioConfigured || !url || !publishableKey) return undefined;
  client ??= createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
