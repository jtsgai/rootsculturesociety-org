import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://rootsculturesociety.org';
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const passwordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const cors = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, content-type' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function initialPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => passwordAlphabet[byte % passwordAlphabet.length]).join('');
}

function membershipEmail(memberId: string) {
  return `${memberId.toLowerCase()}@members.rootsculturesociety.org`;
}

async function requireAdmin(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin' ? user : null;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const operator = await requireAdmin(request);
  if (!operator) return json({ error: 'Administrator access is required.' }, 403);

  try {
    const body = await request.json();
    const action = body.action;
    const memberId = String(body.memberId ?? '').trim().toUpperCase();
    if (!/^R[1-9][0-9]*$/.test(memberId)) return json({ error: 'Member ID must look like R1001.' }, 400);

    if (action === 'create') {
      const displayName = String(body.displayName ?? '').trim();
      const startsOn = String(body.startsOn ?? '');
      const endsOn = String(body.endsOn ?? '');
      const contactEmail = String(body.contactEmail ?? '').trim() || null;
      if (!displayName || !startsOn || !endsOn) return json({ error: 'Name and membership dates are required.' }, 400);
      const password = initialPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: membershipEmail(memberId), password, email_confirm: true,
      });
      if (createError || !created.user) return json({ error: createError?.message ?? 'Could not create the member.' }, 400);
      const userId = created.user.id;
      const { error: profileError } = await admin.from('profiles').insert({ id: userId, role: 'member' });
      const { error: memberError } = await admin.from('members').insert({
        id: userId, member_id: memberId, display_name: displayName, contact_email: contactEmail,
        starts_on: startsOn, ends_on: endsOn, created_by: operator.id,
      });
      const { error: bookError } = await admin.from('genealogy_books').insert({ member_id: userId });
      if (profileError || memberError || bookError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: profileError?.message ?? memberError?.message ?? bookError?.message ?? 'Could not prepare the family book.' }, 400);
      }
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: userId, action: 'member_created', metadata: { member_id: memberId } });
      return json({ memberId, initialPassword: password });
    }

    if (action === 'reset-password') {
      const { data: member } = await admin.from('members').select('id').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: 'Member not found.' }, 404);
      const password = initialPassword();
      const { error } = await admin.auth.admin.updateUserById(member.id, { password });
      if (error) return json({ error: 'Could not reset this password.' }, 400);
      await admin.from('members').update({ must_change_password: true }).eq('id', member.id);
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'password_reset', metadata: { member_id: memberId } });
      return json({ memberId, initialPassword: password });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch {
    return json({ error: 'The request could not be processed.' }, 400);
  }
});
