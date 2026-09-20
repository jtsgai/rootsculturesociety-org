import { getSupabase, isStudioConfigured } from './supabase';

export type StudioBook = { id: string; title: string | null; generation_one_ancestor: string | null; consent_at: string | null };
export type StudioSection = { method: number; content: Record<string, unknown>; is_complete: boolean };
export type StudioPerson = {
  id: string; name: string; generation_number: number; sex: string | null; life_status: string | null;
  birth_year: number | null; occupation: string | null; education: string | null; phone: string | null; address: string | null; note: string | null;
};

export function studioUnavailableMessage() {
  return '会员谱坊正在由学会启用。若你已获发会员号，请向学会确认开通时间。';
}

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error(studioUnavailableMessage());
  return client;
}

export function membershipEmail(memberId: string) {
  return `${memberId.trim().toLowerCase()}@members.rootsculturesociety.org`;
}

export async function signIn(memberId: string, password: string) {
  const client = requireClient();
  const normalizedId = memberId.trim().toUpperCase();
  if (!/^R[1-9][0-9]*$/.test(normalizedId)) throw new Error('请输入格式如 R1001 的会员号。');
  const { error } = await client.auth.signInWithPassword({ email: membershipEmail(normalizedId), password });
  if (error) throw new Error('会员号或密码不正确，或账户暂未开通。');
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await requireClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error('管理员电邮或密码不正确。');
  const profile = await currentProfile();
  if (!profile || profile.role !== 'admin') {
    await requireClient().auth.signOut();
    throw new Error('这个账户没有管理员权限。');
  }
}

export async function requestAdminPasswordReset(email: string) {
  const administratorEmail = email.trim();
  if (!administratorEmail) throw new Error('请先填写管理员电邮。');
  const { error } = await requireClient().auth.resetPasswordForEmail(administratorEmail, {
    redirectTo: `${window.location.origin}/admin/login`,
  });
  if (error) throw new Error('无法寄出设置密码邮件，请稍后重试。');
}

export async function setCurrentPassword(password: string) {
  if (password.length < 12) throw new Error('新密码至少需要 12 个字符。');
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw new Error('无法设置密码，请重新打开邀请链接。');
}

export async function signOut() {
  await requireClient().auth.signOut();
}

export async function currentMember() {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return undefined;
  const { data, error } = await client.from('members').select('member_id, display_name, status, ends_on, must_change_password').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function currentProfile() {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return undefined;
  const { data, error } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function currentBook(): Promise<StudioBook | undefined> {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return undefined;
  const { data, error } = await client.from('genealogy_books').select('id, title, generation_one_ancestor, consent_at').eq('member_id', user.id).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function allSections(bookId: string): Promise<StudioSection[]> {
  const { data, error } = await requireClient().from('studio_sections').select('method, content, is_complete').eq('book_id', bookId).order('method');
  if (error) throw error;
  return data ?? [];
}

export async function getSection(bookId: string, method: number): Promise<StudioSection | undefined> {
  const { data, error } = await requireClient().from('studio_sections').select('method, content, is_complete').eq('book_id', bookId).eq('method', method).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function saveSection(bookId: string, method: number, content: Record<string, unknown>, isComplete: boolean) {
  const { error } = await requireClient().from('studio_sections').upsert({ book_id: bookId, method, content, is_complete: isComplete }, { onConflict: 'book_id,method' });
  if (error) throw error;
}

export async function saveBook(bookId: string, fields: Record<string, string | null>) {
  const { error } = await requireClient().from('genealogy_books').update(fields).eq('id', bookId);
  if (error) throw error;
}

export async function listPeople(bookId: string): Promise<StudioPerson[]> {
  const { data, error } = await requireClient().from('people').select('id, name, generation_number, sex, life_status, birth_year, occupation, education, phone, address, note').eq('book_id', bookId).order('generation_number').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function addPerson(bookId: string, person: Omit<StudioPerson, 'id'>) {
  const { error } = await requireClient().from('people').insert({ book_id: bookId, ...person });
  if (error) throw error;
}

export async function updatePerson(id: string, person: Partial<Omit<StudioPerson, 'id'>>) {
  const { error } = await requireClient().from('people').update(person).eq('id', id);
  if (error) throw error;
}

export async function deletePerson(id: string) {
  const { error } = await requireClient().from('people').delete().eq('id', id);
  if (error) throw error;
}

export async function changeInitialPassword(password: string) {
  if (password.length < 12) throw new Error('新密码至少需要 12 个字符。');
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('无法更新密码，请稍后重试。');
  const { error: completionError } = await client.rpc('complete_initial_password_change');
  if (completionError) throw completionError;
}

export async function uploadImage(bookId: string, file: File, folder = 'images') {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('请先登录。');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片。');
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10MB。');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${user.id}/${bookId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from('genealogy-media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export { isStudioConfigured };
