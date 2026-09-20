import { getSupabase, isStudioConfigured } from './supabase';
import { aiPromptPresets, type AiPromptPreset } from '../data/ai-prompts';

export { aiPromptPresets } from '../data/ai-prompts';
export type { AiPromptPreset } from '../data/ai-prompts';

export type AiFeature = 'cover' | 'restore' | 'prompt' | 'research';

export type AiAssistRequest = {
  bookId: string;
  method?: number;
  feature: AiFeature;
  prompt?: string;
  inputPath?: string;
  context?: Record<string, unknown>;
};

export type AiQuota = {
  balance: number;
  lifetimeConsumed: number;
};

export type AiAssistResponse = {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  remainingCredits: number;
  result?: Record<string, unknown>;
};

export const aiFeatureLabels: Record<AiFeature, string> = {
  cover: '封面图辅助',
  restore: '老照片修复',
  prompt: '提示词助手',
  research: '资料搜索助手',
};

export function getAiPromptPreset(id: string): AiPromptPreset | undefined {
  return aiPromptPresets.find((preset) => preset.id === id);
}

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error('会员系统尚未启用。');
  return client;
}

export async function getAiQuota(): Promise<AiQuota> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('请先登录。');
  const { data, error } = await client
    .from('ai_wallets')
    .select('balance, lifetime_consumed')
    .eq('member_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return { balance: data?.balance ?? 0, lifetimeConsumed: data?.lifetime_consumed ?? 0 };
}

/**
 * Provider-neutral request boundary. The deployed Edge Function owns credit
 * reservation and provider credentials; browser code never receives an API key.
 */
export async function requestAiAssist(request: AiAssistRequest): Promise<AiAssistResponse> {
  if (!isStudioConfigured) throw new Error('会员系统尚未启用。');
  const { data, error } = await requireClient().functions.invoke('ai-assist', { body: request });
  if (error) throw new Error('AI 辅助暂未启用，请稍后再试。');
  return data as AiAssistResponse;
}

export async function listAiJobs(bookId: string) {
  const { data, error } = await requireClient()
    .from('ai_jobs')
    .select('id, method, feature, provider, status, result, output_path, credits_reserved, created_at, completed_at')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
