import { getSupabase } from './supabase';

export const CURRENT_POLICY_VERSION = '2026-09-22-v1';

type PolicyAcceptance = {
  privacy_version: string;
  terms_version: string;
};

function showGate() {
  const gate = document.querySelector<HTMLElement>('[data-studio-policy-gate]');
  if (!gate) return undefined;
  gate.hidden = false;
  document.documentElement.classList.add('studio-policy-required');
  return gate;
}

export async function ensureStudioPolicyAccepted() {
  const client = getSupabase();
  if (!client) return true;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return true;

  const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'member') return true;

  const { data: acceptance, error: acceptanceError } = await client
    .from('member_policy_acceptances')
    .select('privacy_version, terms_version')
    .eq('member_id', user.id)
    .maybeSingle<PolicyAcceptance>();
  if (acceptanceError) throw acceptanceError;
  if (acceptance?.privacy_version === CURRENT_POLICY_VERSION && acceptance.terms_version === CURRENT_POLICY_VERSION) return true;

  const gate = showGate();
  if (!gate) throw new Error('无法显示会员协议确认页，请重新打开会员谱坊。');
  const checkbox = gate.querySelector<HTMLInputElement>('[data-policy-consent]');
  const accept = gate.querySelector<HTMLButtonElement>('[data-policy-accept]');
  const signout = gate.querySelector<HTMLButtonElement>('[data-policy-signout]');
  const status = gate.querySelector<HTMLElement>('[data-policy-status]');

  return new Promise<boolean>((resolve) => {
    const finish = (accepted: boolean) => {
      gate.hidden = true;
      document.documentElement.classList.remove('studio-policy-required');
      resolve(accepted);
    };
    checkbox?.addEventListener('change', () => {
      if (accept) accept.disabled = !checkbox.checked;
    });
    accept?.addEventListener('click', async () => {
      if (!checkbox?.checked) return;
      accept.disabled = true;
      if (status) status.textContent = '正在保存确认记录…';
      const { error } = await client.from('member_policy_acceptances').upsert({
        member_id: user.id,
        privacy_version: CURRENT_POLICY_VERSION,
        terms_version: CURRENT_POLICY_VERSION,
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'member_id' });
      if (error) {
        accept.disabled = false;
        if (status) status.textContent = '暂时无法保存确认记录，请稍后重试。';
        return;
      }
      finish(true);
    });
    signout?.addEventListener('click', async () => {
      await client.auth.signOut();
      window.location.assign('/studio/login');
      finish(false);
    });
  });
}
