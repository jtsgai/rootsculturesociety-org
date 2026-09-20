import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isStudioConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!isStudioConfigured || !url || !publishableKey) return undefined;
  client ??= createClient(url, publishableKey, {
    // Astro serves each member route as a separate static page. A persistent
    // session is therefore required to keep a member signed in while moving
    // between chapters, previews, and the dashboard.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
