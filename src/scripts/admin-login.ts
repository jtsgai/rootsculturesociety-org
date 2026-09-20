import { getSupabase, isStudioConfigured } from '../lib/supabase';
import { currentProfile, requestAdminPasswordReset, setCurrentPassword, signInAdmin, studioUnavailableMessage } from '../lib/studio';

const signInForm = document.querySelector<HTMLFormElement>('[data-admin-signin-form]');
const passwordForm = document.querySelector<HTMLFormElement>('[data-admin-password-form]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
// Capture this before Supabase creates its client: the client consumes and clears
// the recovery hash while establishing the session.
const authLinkType = new URLSearchParams(window.location.hash.slice(1)).get('type');
const isPasswordSetupLink = authLinkType === 'invite' || authLinkType === 'recovery';

function report(message: string) {
  if (status) status.textContent = message;
}

function showPasswordSetup() {
  if (signInForm) signInForm.hidden = true;
  if (passwordForm) passwordForm.hidden = false;
}

async function inspectInviteSession() {
  if (!isStudioConfigured) return;
  const client = getSupabase();
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return;
  const profile = await currentProfile();
  if (!profile || profile.role !== 'admin') {
    await client.auth.signOut();
    return;
  }
  if (isPasswordSetupLink) {
    showPasswordSetup();
    report('链接已确认，请设置管理员密码。');
  } else {
    window.location.assign('/admin/members');
  }
}

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    report('正在验证管理员账户…');
    await signInAdmin(values.email, values.password);
    window.location.assign('/admin/members');
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
});

document.querySelector<HTMLButtonElement>('[data-admin-password-reset]')?.addEventListener('click', async () => {
  const email = signInForm?.elements.namedItem('email');
  const administratorEmail = email instanceof HTMLInputElement ? email.value : '';
  try {
    report('正在寄出设置密码邮件…');
    await requestAdminPasswordReset(administratorEmail);
    report('已寄出。请打开最新的一封「Reset your password」邮件，并由该链接设置新密码。');
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
});

passwordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  if (values.password !== values.passwordAgain) {
    report('两次输入的密码不一致。');
    return;
  }
  try {
    report('正在保存密码…');
    await setCurrentPassword(values.password);
    window.history.replaceState({}, document.title, '/admin/login');
    window.location.assign('/admin/members');
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
});

void inspectInviteSession().catch((error) => report(error instanceof Error ? error.message : studioUnavailableMessage()));
