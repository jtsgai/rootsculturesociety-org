import { getSupabase, isStudioConfigured } from './supabase';

export type AiCreditKind = 'grant' | 'purchase' | 'refund' | 'adjustment';

export async function grantAiCreditsByMemberId(memberId: string, amount: number, kind: AiCreditKind, note: string) {
  if (!isStudioConfigured) throw new Error('会员系统尚未启用。');
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('额度必须是大于 0 的整数。');
  const client = getSupabase();
  if (!client) throw new Error('会员系统尚未启用。');

  const { data: member, error: memberError } = await client
    .from('members')
    .select('id')
    .eq('member_id', memberId.trim().toUpperCase())
    .maybeSingle();
  if (memberError || !member) throw new Error('找不到这个会员号。');
  const { data, error } = await client.rpc('grant_ai_credits', {
    target_member_id: member.id,
    credit_amount: amount,
    credit_kind: kind,
    credit_note: note.trim() || null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
