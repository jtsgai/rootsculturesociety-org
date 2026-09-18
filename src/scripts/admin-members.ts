import { getSupabase, isStudioConfigured } from '../lib/supabase';
import { currentProfile, studioUnavailableMessage } from '../lib/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const once = document.querySelector<HTMLElement>('[data-admin-password]');
const memberOutput = document.querySelector<HTMLElement>('[data-admin-member-id]');
const passwordOutput = document.querySelector<HTMLElement>('[data-admin-initial-password]');

function report(message: string) {
  if (status) status.textContent = message;
}

function showPassword(result: { memberId: string; initialPassword: string }) {
  if (memberOutput) memberOutput.textContent = result.memberId;
  if (passwordOutput) passwordOutput.textContent = result.initialPassword;
  if (once) once.hidden = false;
}

async function callAdmin(action: 'create' | 'reset-password', values: Record<string, string>) {
  if (!isStudioConfigured) throw new Error(studioUnavailableMessage());
  const client = getSupabase();
  const { data, error } = await client!.functions.invoke('admin-members', { body: { action, ...values } });
  if (error) throw new Error('无法连接会员管理服务。');
  if (data?.error) throw new Error(data.error);
  return data as { memberId: string; initialPassword: string };
}

document.querySelector<HTMLFormElement>('[data-admin-create-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    const result = await callAdmin('create', values);
    showPassword(result);
    report('会员已经开通。请在离开本页前安全交付这组一次性密码。');
  } catch (error) { report(error instanceof Error ? error.message : '无法开通会员。'); }
});

document.querySelector<HTMLFormElement>('[data-admin-reset-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    const result = await callAdmin('reset-password', values);
    showPassword(result);
    report('密码已重设。请安全交付这组一次性密码。');
  } catch (error) { report(error instanceof Error ? error.message : '无法重设密码。'); }
});

void (async () => {
  try {
    const profile = await currentProfile();
    if (!profile || profile.role !== 'admin') report('此页面仅供学会资料管理员使用。');
  } catch (error) { report(error instanceof Error ? error.message : studioUnavailableMessage()); }
})();
