import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://rootsculturesociety.org';
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const passwordLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const passwordDigits = '23456789';
const passwordAlphabet = `${passwordLetters}${passwordDigits}`;
const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function initialPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const characters = [
    passwordLetters[bytes[0] % passwordLetters.length],
    passwordDigits[bytes[1] % passwordDigits.length],
    ...Array.from(bytes.slice(2), (byte) => passwordAlphabet[byte % passwordAlphabet.length]),
  ];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = bytes[index] % (index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join('');
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

    if (action === 'get-settings') {
      const { data: setting, error } = await admin.from('site_settings').select('value').eq('key', 'member_pdf_download_enabled').maybeSingle();
      if (error) return json({ error: 'Could not read member download settings.' }, 400);
      return json({ memberPdfDownloadEnabled: setting?.value === true });
    }

    if (action === 'update-settings') {
      const enabled = body.memberPdfDownloadEnabled === true || body.memberPdfDownloadEnabled === 'true';
      const { error } = await admin.from('site_settings').upsert({ key: 'member_pdf_download_enabled', value: enabled, updated_at: new Date().toISOString() });
      if (error) return json({ error: 'Could not save member download settings.' }, 400);
      await admin.from('member_audit_log').insert({ actor_id: operator.id, action: 'member_pdf_download_setting_updated', metadata: { enabled } });
      return json({ memberPdfDownloadEnabled: enabled });
    }

    if (action === 'list') {
      const today = new Date().toISOString().slice(0, 10);
      await admin.from('members').update({ status: 'expired', closed_at: new Date().toISOString(), purge_after: new Date(Date.now() + 90 * 86400000).toISOString() }).eq('status', 'active').lt('ends_on', today);
      const { data: members, error } = await admin
        .from('members')
        .select('member_id, display_name, contact_email, contact_phone, starts_on, ends_on, status, closed_at, purge_after')
        .order('member_id');
      if (error) return json({ error: 'Could not read member records.' }, 400);
      return json({ members });
    }

    if (action === 'update-membership') {
      const status = String(body.status ?? '');
      const startsOn = String(body.startsOn ?? '').trim();
      const endsOn = String(body.endsOn ?? '').trim();
      if (!['active', 'suspended', 'expired'].includes(status)) return json({ error: 'Invalid membership status.' }, 400);
      if (!endsOn || (startsOn && endsOn < startsOn)) return json({ error: 'The membership dates are invalid.' }, 400);
      const { data: member } = await admin.from('members').select('id, starts_on').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: 'Member not found.' }, 404);
      const updates: Record<string, string> = { status, ends_on: endsOn };
      if (status === 'active') {
        updates.closed_at = null as unknown as string;
        updates.purge_after = null as unknown as string;
      } else if (status === 'expired') {
        updates.closed_at = new Date().toISOString();
        updates.purge_after = new Date(Date.now() + 90 * 86400000).toISOString();
      }
      if (startsOn) updates.starts_on = startsOn;
      const { error } = await admin.from('members').update(updates).eq('id', member.id);
      if (error) return json({ error: 'Could not update this membership.' }, 400);
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'membership_updated', metadata: { member_id: memberId, status, starts_on: startsOn || member.starts_on, ends_on: endsOn } });
      return json({ memberId, status, startsOn: startsOn || member.starts_on, endsOn: endsOn });
    }

    if (action === 'prepare-download') {
      const purpose = String(body.purpose ?? '').trim();
      if (purpose.length < 4 || purpose.length > 200) return json({ error: 'Please provide a short download purpose.' }, 400);
      const { data: member } = await admin.from('members').select('id, member_id, display_name').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: 'Member not found.' }, 404);
      const { data: books, error: booksError } = await admin.from('genealogy_books').select('id, title').eq('member_id', member.id).limit(1);
      if (booksError || !books?.[0]) return json({ error: 'This member has no family book.' }, 404);
      const book = books[0];
      const { data: media, error: mediaError } = await admin.from('studio_media').select('storage_path, method, caption').eq('book_id', book.id).order('created_at');
      if (mediaError) return json({ error: 'Could not read private media records.' }, 400);
      const files = [];
      for (const item of media ?? []) {
        const { data: signed, error: signedError } = await admin.storage.from('genealogy-media').createSignedUrl(item.storage_path, 300);
        if (!signedError && signed?.signedUrl) files.push({ method: item.method, caption: item.caption, path: item.storage_path, signedUrl: signed.signedUrl });
      }
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'private_media_download_prepared', metadata: { member_id: memberId, book_id: book.id, purpose, file_count: files.length } });
      return json({ member: { memberId: member.member_id, displayName: member.display_name }, book: { id: book.id, title: book.title }, files, expiresInSeconds: 300 });
    }

    if (!/^R[1-9][0-9]*$/.test(memberId)) return json({ error: 'Member ID must look like R1001.' }, 400);

    if (action === 'create') {
      const displayName = String(body.displayName ?? '').trim();
      const startsOn = String(body.startsOn ?? '');
      const endsOn = String(body.endsOn ?? '');
      const contactEmail = String(body.contactEmail ?? '').trim().toLowerCase();
      const contactPhone = String(body.contactPhone ?? '').trim();
      const phoneDigits = contactPhone.replace(/\D/g, '');
      if (!displayName || !startsOn || !endsOn || !contactEmail || !contactPhone) {
        return json({ error: 'Name, email, phone number and membership dates are required.' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return json({ error: 'Enter a valid contact email address.' }, 400);
      if (phoneDigits.length < 8 || phoneDigits.length > 15) return json({ error: 'Enter a valid contact phone number.' }, 400);
      if (endsOn < startsOn) return json({ error: 'The membership end date cannot be before the start date.' }, 400);
      const password = initialPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: membershipEmail(memberId), password, email_confirm: true,
      });
      if (createError || !created.user) return json({ error: createError?.message ?? 'Could not create the member.' }, 400);
      const userId = created.user.id;
      const { error: profileError } = await admin.from('profiles').insert({ id: userId, role: 'member' });
      const { error: memberError } = await admin.from('members').insert({
        id: userId, member_id: memberId, display_name: displayName, contact_email: contactEmail, contact_phone: contactPhone,
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
