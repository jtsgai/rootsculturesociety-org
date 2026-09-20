import { getSupabase, isStudioConfigured } from './supabase';

export type StudioBook = { id: string; title: string | null; generation_one_ancestor: string | null; consent_at: string | null };
export type StudioSection = { method: number; content: Record<string, unknown>; is_complete: boolean; updated_at?: string };
export type StudioPerson = {
  id: string; name: string; generation_number: number; sex: string | null; life_status: string | null;
  father_id: string | null; mother_id: string | null; spouse_id: string | null;
  birth_year: number | null; occupation: string | null; education: string | null; phone: string | null; address: string | null; note: string | null;
};
export type StudioMedia = {
  id: string;
  book_id: string;
  member_id: string;
  method: number;
  storage_path: string;
  caption: string | null;
  kind: 'image';
  created_at: string;
  updated_at: string;
  signed_url?: string;
  needs_normalization?: boolean;
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
  assertPasswordPolicy(password);
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

export async function memberPdfDownloadEnabled() {
  const { data, error } = await requireClient()
    .from('site_settings')
    .select('value')
    .eq('key', 'member_pdf_download_enabled')
    .maybeSingle();
  if (error) throw error;
  return data?.value === true;
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
  const { data, error } = await requireClient().from('studio_sections').select('method, content, is_complete, updated_at').eq('book_id', bookId).order('method');
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

export async function listPeople(bookId: string, options: { includeSensitive?: boolean } = {}): Promise<StudioPerson[]> {
  const sensitiveFields = options.includeSensitive ? ', occupation, education, phone, address' : '';
  const { data, error } = await requireClient().from('people').select(`id, name, generation_number, sex, life_status, father_id, mother_id, spouse_id, birth_year${sensitiveFields}, note`).eq('book_id', bookId).order('generation_number').order('name');
  if (error) throw error;
  return (data ?? []) as unknown as StudioPerson[];
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
  assertPasswordPolicy(password);
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('无法更新密码，请稍后重试。');
  const { error: completionError } = await client.rpc('complete_initial_password_change');
  if (completionError) throw completionError;
}

function assertPasswordPolicy(password: string) {
  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw new Error('密码至少 8 位，并须同时包含字母和数字；字母大小写均可。');
  }
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

type DecodedImage = { source: CanvasImageSource; width: number; height: number; close?: () => void };
type NormalizedImage = { original: File; display: File; thumb: File };

async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('无法读取这张图片。'));
        element.src = url;
      });
      return { source: image, width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function encodeJpeg(source: DecodedImage, maxEdge: number, initialQuality: number, targetBytes: number, fileName: string) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法处理图片。');
  context.fillStyle = '#fffaf3';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source.source, 0, 0, canvas.width, canvas.height);

  return new Promise<File>((resolve, reject) => {
    let quality = initialQuality;
    const render = () => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('无法生成图片预览。'));
      if (blob.size > targetBytes && quality > 0.52) {
        quality -= 0.08;
        render();
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
    }, 'image/jpeg', quality);
    render();
  });
}

async function normalizeImage(file: File): Promise<NormalizedImage> {
  const source = await decodeImage(file);
  try {
    const [display, thumb] = await Promise.all([
      encodeJpeg(source, 2400, 0.84, 2 * 1024 * 1024, 'display.jpg'),
      encodeJpeg(source, 720, 0.78, 450 * 1024, 'thumb.jpg'),
    ]);
    return { original: file, display, thumb };
  } finally {
    source.close?.();
  }
}

function originalExtension(file: File) {
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
}

function variantPath(originalPath: string, variant: 'display.jpg' | 'thumb.jpg') {
  const marker = originalPath.lastIndexOf('/original.');
  return marker === -1 ? null : `${originalPath.slice(0, marker)}/${variant}`;
}

async function uploadStorageFile(path: string, file: File) {
  const client = requireClient();
  const { error } = await client.storage.from('genealogy-media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
}

export async function listMedia(bookId: string, method: number): Promise<StudioMedia[]> {
  const { data, error } = await requireClient()
    .from('studio_media')
    .select('id, book_id, member_id, method, storage_path, caption, kind, created_at, updated_at')
    .eq('book_id', bookId)
    .eq('method', method)
    .order('created_at');
  if (error) throw error;
  const media = (data ?? []) as StudioMedia[];
  return Promise.all(media.map(async (item) => {
    const signedUrl = await signedPreviewUrl(item.storage_path);
    return { ...item, signed_url: signedUrl, needs_normalization: !signedUrl };
  }));
}

export async function signedMediaUrl(path: string) {
  const { data, error } = await requireClient().storage.from('genealogy-media').createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw error ?? new Error('无法读取图片。');
  return data.signedUrl;
}

async function signedPreviewUrl(originalPath: string) {
  const displayPath = variantPath(originalPath, 'display.jpg');
  // Legacy records may point directly at the original file. Never fall back to
  // that path for a member preview; originals are administrator-only.
  if (!displayPath) return undefined;
  try { return await signedMediaUrl(displayPath); } catch { return undefined; }
}

export async function uploadMedia(bookId: string, method: number, file: File, caption: string | null = null) {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('请先登录。');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片。');
  if (file.size > 10 * 1024 * 1024) throw new Error('原始图片不能超过 10MB。');
  const normalized = await normalizeImage(file);
  const base = `${user.id}/${bookId}/method-${method}/${crypto.randomUUID()}`;
  const originalPath = `${base}/original.${originalExtension(file)}`;
  const displayPath = `${base}/display.jpg`;
  const thumbPath = `${base}/thumb.jpg`;
  const uploadedPaths: string[] = [];
  const { data, error } = await client
    .from('studio_media')
    .insert({ book_id: bookId, member_id: user.id, method, storage_path: originalPath, caption })
    .select('id, book_id, member_id, method, storage_path, caption, kind, created_at, updated_at')
    .single();
  if (error) throw error;
  try {
    for (const [path, image] of [[originalPath, normalized.original], [displayPath, normalized.display], [thumbPath, normalized.thumb]] as const) {
      await uploadStorageFile(path, image);
      uploadedPaths.push(path);
    }
    return { ...(data as StudioMedia), signed_url: await signedMediaUrl(displayPath) };
  } catch (uploadError) {
    await client.from('studio_media').delete().eq('id', data.id);
    if (uploadedPaths.length) await client.storage.from('genealogy-media').remove(uploadedPaths);
    throw uploadError;
  }
}

export async function updateMediaCaption(id: string, caption: string | null) {
  const { error } = await requireClient().from('studio_media').update({ caption }).eq('id', id);
  if (error) throw error;
}

export async function removeMedia(media: StudioMedia) {
  const client = requireClient();
  const { error } = await client.from('studio_media').delete().eq('id', media.id);
  if (error) throw error;
  const paths = [media.storage_path, variantPath(media.storage_path, 'display.jpg'), variantPath(media.storage_path, 'thumb.jpg')].filter((path): path is string => Boolean(path));
  const { error: storageError } = await client.storage.from('genealogy-media').remove(paths);
  if (storageError) throw storageError;
}

export { isStudioConfigured };
