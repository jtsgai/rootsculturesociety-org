import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const rememberSessionKey = 'rcss-remember-member-session';

export const isStudioConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | undefined;

export function setRememberSession(remember: boolean) {
  if (typeof window !== 'undefined') window.localStorage.setItem(rememberSessionKey, remember ? 'true' : 'false');
}

function shouldPersistSession() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(rememberSessionKey) !== 'false';
}

export function getSupabase() {
  if (!isStudioConfigured || !url || !publishableKey) return undefined;
  client ??= createClient(url, publishableKey, {
    auth: { persistSession: shouldPersistSession(), autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
