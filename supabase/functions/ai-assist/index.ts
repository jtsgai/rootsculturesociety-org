import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const allowedOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://rootsculturesociety.org';
const provider = Deno.env.get('AI_PROVIDER') ?? 'disabled';
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const costs: Record<string, number> = { cover: 3, restore: 2, prompt: 1, research: 1 };
// Keep this empty until a provider adapter has been reviewed and deliberately enabled.
const configuredAdapters = new Set<string>();
const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function requireUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  return user ? { user, token } : null;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const session = await requireUser(request);
  if (!session) return json({ error: 'Login is required.' }, 401);
  if (provider === 'disabled' || !configuredAdapters.has(provider))
    return json({ error: 'AI assistance is not enabled yet.' }, 503);
  if (!publishableKey) return json({ error: 'AI service is not configured.' }, 503);

  try {
    const body = await request.json();
    const feature = String(body.feature ?? '');
    const bookId = String(body.bookId ?? '');
    const method = body.method == null ? null : Number(body.method);
    const cost = costs[feature];
    if (!cost || !bookId || (method !== null && (!Number.isInteger(method) || method < 1 || method > 8))) {
      return json({ error: 'Invalid AI request.' }, 400);
    }

    const memberClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${session.token}` } },
    });
    const { data: book, error: bookError } = await memberClient
      .from('genealogy_books')
      .select('id')
      .eq('id', bookId)
      .eq('member_id', session.user.id)
      .maybeSingle();
    if (bookError || !book) return json({ error: 'The requested book is not available.' }, 403);

    const requestToken = crypto.randomUUID();
    const { data: reservation, error: reservationError } = await memberClient
      .rpc('reserve_ai_credits', {
        requested_feature: feature,
        requested_cost: cost,
        request_token: requestToken,
      })
      .maybeSingle();
    if (reservationError) return json({ error: 'Could not check the AI allowance.' }, 500);
    if (!reservation?.approved)
      return json({ error: 'AI allowance is used up.', remainingCredits: reservation?.remaining ?? 0 }, 402);

    // Provider adapters will be added here after the Society chooses an API.
    // This branch is unreachable until an adapter is deliberately enabled, so
    // a disabled or unknown provider can never reserve or consume credits.
    return json({ error: `AI provider "${provider}" has no adapter yet.` }, 503);
  } catch {
    return json({ error: 'The AI request could not be processed.' }, 400);
  }
});
