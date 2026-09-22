import { getSupabase, isStudioConfigured } from './supabase';

export type ActivityEvent = {
  id: string;
  slug: string;
  title_zh: string;
  title_en: string;
  summary_zh: string;
  summary_en: string;
  event_date: string | null;
  date_label_zh: string | null;
  date_label_en: string | null;
  location_zh: string | null;
  location_en: string | null;
  image_path: string | null;
  image_alt_zh: string | null;
  image_alt_en: string | null;
  source_url: string | null;
  source_label_zh: string | null;
  source_label_en: string | null;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

const publicFields = 'id, slug, title_zh, title_en, summary_zh, summary_en, event_date, date_label_zh, date_label_en, location_zh, location_en, image_path, image_alt_zh, image_alt_en, source_url, source_label_zh, source_label_en, is_published, sort_order, created_at, updated_at';

function requireClient() {
  const client = getSupabase();
  if (!client || !isStudioConfigured) throw new Error('活动资料系统尚未启用。');
  return client;
}

export async function listPublishedActivityEvents(): Promise<ActivityEvent[]> {
  const { data, error } = await requireClient()
    .from('activity_events')
    .select(publicFields)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}

export async function listActivityEvents(): Promise<ActivityEvent[]> {
  const { data, error } = await requireClient()
    .from('activity_events')
    .select(publicFields)
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}

export async function createActivityEvent(values: Partial<ActivityEvent>) {
  const { data, error } = await requireClient().from('activity_events').insert(values).select(publicFields).single();
  if (error) throw error;
  return data as ActivityEvent;
}

export async function updateActivityEvent(id: string, values: Partial<ActivityEvent>) {
  const { data, error } = await requireClient().from('activity_events').update(values).eq('id', id).select(publicFields).single();
  if (error) throw error;
  return data as ActivityEvent;
}

export async function deleteActivityEvent(id: string) {
  const { error } = await requireClient().from('activity_events').delete().eq('id', id);
  if (error) throw error;
}
