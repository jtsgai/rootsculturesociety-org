import { getSupabase, isStudioConfigured } from './supabase';

export type ExportFormat = 'web' | 'pdf';
export type ExportStatus = 'queued' | 'running' | 'ready' | 'failed';

export type BookExport = {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  storage_path: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type PublicChapterRequest = {
  bookId: string;
  method: number;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  mediaPaths?: string[];
};

export type PublicStoryRequest = {
  id: string;
  book_id: string;
  member_id: string;
  method: number;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  media_paths: string[];
  status: 'draft' | 'pending' | 'published' | 'withdrawn';
  consent_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

function requireClient() {
  const client = getSupabase();
  if (!client || !isStudioConfigured) throw new Error('会员系统尚未启用。');
  return client;
}

export async function requestBookExport(bookId: string, format: ExportFormat) {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('请先登录。');

  const { data, error } = await client
    .from('book_exports')
    .insert({ book_id: bookId, member_id: user.id, format })
    .select('id, format, status, storage_path, error_message, created_at, completed_at')
    .single();
  if (error) throw error;
  return data as BookExport;
}

export async function listBookExports(bookId: string): Promise<BookExport[]> {
  const { data, error } = await requireClient()
    .from('book_exports')
    .select('id, format, status, storage_path, error_message, created_at, completed_at')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookExport[];
}

/** Save one selected chapter as a publication request, without exposing the private book. */
export async function requestChapterPublication(request: PublicChapterRequest) {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('请先登录。');

  const { data, error } = await client
    .from('public_story_sections')
    .upsert(
      {
        book_id: request.bookId,
        member_id: user.id,
        method: request.method,
        slug: request.slug,
        title: request.title,
        content: request.content,
        media_paths: request.mediaPaths ?? [],
        status: 'pending',
        consent_at: new Date().toISOString(),
      },
      { onConflict: 'book_id,method' }
    )
    .select('id, method, slug, title, status, consent_at, reviewed_at, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}

const publicStoryFields = 'id, book_id, member_id, method, slug, title, content, media_paths, status, consent_at, reviewed_at, review_note, created_at, updated_at';

export async function listOwnPublicationRequests(bookId: string): Promise<PublicStoryRequest[]> {
  const { data, error } = await requireClient().from('public_story_sections').select(publicStoryFields).eq('book_id', bookId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicStoryRequest[];
}

export async function listPublicationQueue(): Promise<PublicStoryRequest[]> {
  const { data, error } = await requireClient().from('public_story_sections').select(publicStoryFields).in('status', ['pending', 'withdrawn']).order('updated_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PublicStoryRequest[];
}

export async function reviewPublicationRequest(id: string, status: 'published' | 'draft' | 'withdrawn', reviewNote: string | null = null) {
  const { data, error } = await requireClient().from('public_story_sections').update({ status, review_note: reviewNote, reviewed_at: new Date().toISOString() }).eq('id', id).select(publicStoryFields).single();
  if (error) throw error;
  return data as PublicStoryRequest;
}

export async function withdrawPublicationRequest(id: string) {
  const { data, error } = await requireClient().from('public_story_sections').update({ status: 'withdrawn' }).eq('id', id).eq('status', 'pending').select(publicStoryFields).single();
  if (error) throw error;
  return data as PublicStoryRequest;
}

export async function listPublishedStories(): Promise<PublicStoryRequest[]> {
  const { data, error } = await requireClient().from('public_story_sections').select('id, method, slug, title, content, media_paths, status, created_at, updated_at').eq('status', 'published').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicStoryRequest[];
}
