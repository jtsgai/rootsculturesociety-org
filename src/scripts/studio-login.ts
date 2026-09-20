import { signIn, studioUnavailableMessage } from '../lib/studio';
import { setRememberSession } from '../lib/supabase';

const form = document.querySelector<HTMLFormElement>('[data-studio-login-form]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const remember = document.querySelector<HTMLInputElement>('[data-remember-session]');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const values = new FormData(form);
  setRememberSession(Boolean(remember?.checked));
  if (status) status.textContent = '正在进入你的相册家谱…';
  if (button) button.disabled = true;
  try {
    await signIn(String(values.get('memberId') ?? ''), String(values.get('password') ?? ''));
    window.location.assign('/studio');
  } catch (error) {
    if (status) status.textContent = error instanceof Error ? error.message : studioUnavailableMessage();
  } finally {
    if (button) button.disabled = false;
  }
});
