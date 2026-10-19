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
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
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
  if (request.method !== 'POST') return json({ error: '不支持此请求方式。' }, 405);
  const operator = await requireAdmin(request);
  if (!operator) return json({ error: '需要管理员权限。' }, 403);

  try {
    const body = await request.json();
    const action = body.action;
    let memberId = String(body.memberId ?? '').trim().toUpperCase();

    if (action === 'next_member_no') {
      const { data, error } = await admin.rpc('next_member_no');
      return error ? json({ error: '无法取得建议会员号。' }, 400) : json({ memberId: data });
    }

    if (action === 'list-payments' || action === 'record-payment') {
      const { data: member } = await admin.from('members').select('id').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: '找不到这位会员。' }, 404);
      if (action === 'list-payments') {
        const { data, error } = await admin.from('membership_payments').select('*').eq('member_id', member.id).order('paid_on', { ascending: false }).order('created_at', { ascending: false });
        return error ? json({ error: '无法读取缴费记录。' }, 400) : json({ payments: data });
      }
      const amount = String(body.amount ?? '99.00');
      const method = String(body.method ?? 'PayNow').trim();
      if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !method) return json({ error: '请填写有效金额及缴费方式。' }, 400);
      const { error } = await admin.rpc('record_membership_payment', {
        target_member: member.id, payment_amount: Number(amount), payment_method: method,
        reference: String(body.paynowReference ?? '').trim() || null,
        payment_date: body.paidOn || new Date().toISOString().slice(0, 10),
        start_date: body.membershipStart || null, end_date: body.membershipEnd || null,
        payment_notes: String(body.notes ?? '').trim() || null,
        extend_membership: body.extendMembership === 'true', operator_id: operator.id,
      });
      return error ? json({ error: error.message.includes('延长会籍') ? error.message : '无法录入缴费，请检查日期和金额。' }, 400) : json({ memberId });
    }

    if (action === 'list') {
      const today = new Date().toISOString().slice(0, 10);
      await admin.from('members').update({ status: 'expired', closed_at: new Date().toISOString(), purge_after: new Date(Date.now() + 90 * 86400000).toISOString() }).eq('status', 'active').lt('ends_on', today);
      const { data: members, error } = await admin
        .from('members')
        .select('member_id, display_name, contact_email, contact_phone, starts_on, ends_on, status, pdf_download_enabled, closed_at, purge_after')
        .order('member_id');
      if (error) return json({ error: '无法读取会员名册。' }, 400);
      return json({ members });
    }

    if (action === 'update-membership') {
      const status = String(body.status ?? '');
      const startsOn = String(body.startsOn ?? '').trim();
      const endsOn = String(body.endsOn ?? '').trim();
      const pdfDownloadEnabled = body.pdfDownloadEnabled === true || body.pdfDownloadEnabled === 'true';
      if (!['active', 'suspended', 'expired'].includes(status)) return json({ error: '会籍状态无效。' }, 400);
      if (!endsOn || (startsOn && endsOn < startsOn)) return json({ error: '会籍日期无效。' }, 400);
      const { data: member } = await admin.from('members').select('id, starts_on').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: '找不到这位会员。' }, 404);
      const updates: Record<string, string | boolean | null> = { status, ends_on: endsOn, pdf_download_enabled: pdfDownloadEnabled };
      if (status === 'active') {
        updates.closed_at = null;
        updates.purge_after = null;
      } else if (status === 'expired') {
        updates.closed_at = new Date().toISOString();
        updates.purge_after = new Date(Date.now() + 90 * 86400000).toISOString();
      }
      if (startsOn) updates.starts_on = startsOn;
      const { error } = await admin.from('members').update(updates).eq('id', member.id);
      if (error) return json({ error: '无法更新会籍资料。' }, 400);
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'membership_updated', metadata: { member_id: memberId, status, starts_on: startsOn || member.starts_on, ends_on: endsOn, pdf_download_enabled: pdfDownloadEnabled } });
      return json({ memberId, status, startsOn: startsOn || member.starts_on, endsOn: endsOn, pdfDownloadEnabled });
    }

    if (action === 'prepare-download') {
      const purpose = String(body.purpose ?? '').trim();
      if (purpose.length < 4 || purpose.length > 200) return json({ error: '请填写 4 至 200 字的下载用途。' }, 400);
      const { data: member } = await admin.from('members').select('id, member_id, display_name').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: '找不到这位会员。' }, 404);
      const { data: books, error: booksError } = await admin.from('genealogy_books').select('id, title').eq('member_id', member.id).limit(1);
      if (booksError || !books?.[0]) return json({ error: '这位会员尚未建立家谱。' }, 404);
      const book = books[0];
      const { data: media, error: mediaError } = await admin.from('studio_media').select('storage_path, method, caption').eq('book_id', book.id).order('created_at');
      if (mediaError) return json({ error: '无法读取私密照片记录。' }, 400);
      const files = [];
      for (const item of media ?? []) {
        const { data: signed, error: signedError } = await admin.storage.from('genealogy-media').createSignedUrl(item.storage_path, 300);
        if (!signedError && signed?.signedUrl) files.push({ method: item.method, caption: item.caption, path: item.storage_path, signedUrl: signed.signedUrl });
      }
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'private_media_download_prepared', metadata: { member_id: memberId, book_id: book.id, purpose, file_count: files.length } });
      return json({ member: { memberId: member.member_id, displayName: member.display_name }, book: { id: book.id, title: book.title }, files, expiresInSeconds: 300 });
    }

    if ((memberId || action !== 'create') && !/^R[1-9][0-9]{3}$/.test(memberId)) return json({ error: '会员号须为 R 加四位数字。' }, 400);

    if (action === 'create') {
      const displayName = String(body.displayName ?? '').trim();
      const startsOn = String(body.startsOn ?? '');
      const endsOn = String(body.endsOn ?? '');
      const contactEmail = String(body.contactEmail ?? '').trim().toLowerCase();
      const contactPhone = String(body.contactPhone ?? '').trim();
      const phoneDigits = contactPhone.replace(/\D/g, '');
      if (!displayName || !startsOn || !endsOn || !contactEmail || !contactPhone) {
        return json({ error: '请填写姓名、电邮、手机及会籍日期。' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return json({ error: '请填写有效的联络电邮。' }, 400);
      if (phoneDigits.length < 8 || phoneDigits.length > 15) return json({ error: '请填写有效的手机号码。' }, 400);
      if (endsOn < startsOn) return json({ error: '会籍结束日期不能早于开始日期。' }, 400);
      // Auth and public-schema writes cannot share a transaction. Provision the
      // locked number first under a temporary Auth address, then install the login address.
      const password = initialPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: `pending-${crypto.randomUUID()}@members.rootsculturesociety.org`, password, email_confirm: true,
      });
      if (createError || !created.user) return json({ error: '无法建立会员账户。' }, 400);
      const userId = created.user.id;
      const { data: allocated, error: provisionError } = await admin.rpc('provision_member', {
        target_user: userId, requested_no: memberId, member_name: displayName,
        email: contactEmail, phone: contactPhone, start_date: startsOn, end_date: endsOn, operator_id: operator.id,
      });
      if (provisionError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: provisionError.message.includes('会员号') ? provisionError.message : '无法开通会员，请检查资料。' }, 400);
      }
      memberId = allocated;
      const { error: addressError } = await admin.auth.admin.updateUserById(userId, { email: membershipEmail(memberId), email_confirm: true });
      if (addressError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: '该会员号的登录账户已存在或无法建立，请检查后重试。' }, 400);
      }
      return json({ memberId, initialPassword: password });
    }

    if (action === 'reset-password') {
      const { data: member } = await admin.from('members').select('id').eq('member_id', memberId).maybeSingle();
      if (!member) return json({ error: '找不到这位会员。' }, 404);
      const { error: guardError } = await admin.from('member_password_guards').upsert({ member_id: member.id, initial_hash: 'pending' });
      const { error: lockError } = await admin.from('members').update({ must_change_password: true }).eq('id', member.id);
      if (lockError || guardError) return json({ error: '无法锁定账户以重设密码，请稍后重试。' }, 400);
      const password = initialPassword();
      const { error } = await admin.auth.admin.updateUserById(member.id, { password });
      if (error) return json({ error: '无法重设密码。' }, 400);
      const { error: markerError } = await admin.rpc('mark_member_password_reset', { target_member: member.id });
      if (markerError) return json({ error: '密码已重设但安全标记失败，请再次重设密码。' }, 400);
      await admin.from('member_audit_log').insert({ actor_id: operator.id, member_id: member.id, action: 'password_reset', metadata: { member_id: memberId } });
      return json({ memberId, initialPassword: password });
    }
    return json({ error: '未知的操作。' }, 400);
  } catch {
    return json({ error: '无法处理此请求。' }, 400);
  }
});
