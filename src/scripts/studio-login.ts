import { currentMember, signIn, studioUnavailableMessage } from '../lib/studio';

const form = document.querySelector<HTMLFormElement>('[data-studio-login-form]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const memberIdInput = form?.querySelector<HTMLInputElement>('input[name="memberId"]');
const rememberedMemberKey = 'rcss-remembered-member-id';

try {
  const rememberedMember = localStorage.getItem(rememberedMemberKey);
  if (memberIdInput && rememberedMember && /^R[1-9][0-9]*$/i.test(rememberedMember)) {
    memberIdInput.value = rememberedMember.toUpperCase();
  }
} catch {
  // Private browsing or a storage restriction must not block login.
}

void (async () => {
  try {
    const member = await currentMember();
    if (member) window.location.assign('/studio');
  } catch {
    // An unauthenticated visitor should simply see the login form.
  }
})();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const values = new FormData(form);
  const memberId = String(values.get('memberId') ?? '').trim().toUpperCase();
  if (status) status.textContent = '正在进入你的相册家谱…';
  if (button) button.disabled = true;
  try {
    await signIn(memberId, String(values.get('password') ?? ''));
    try {
      localStorage.setItem(rememberedMemberKey, memberId);
    } catch {
      // Private browsing or a storage restriction must not block login.
    }
    window.location.assign('/studio');
  } catch (error) {
    if (status) status.textContent = error instanceof Error ? error.message : studioUnavailableMessage();
  } finally {
    if (button) button.disabled = false;
  }
});
