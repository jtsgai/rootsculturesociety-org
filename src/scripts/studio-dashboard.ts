import { allSections, changeInitialPassword, currentBook, currentMember, signOut, studioUnavailableMessage } from '../lib/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
const title = document.querySelector<HTMLElement>('[data-studio-book-title]');
const memberName = document.querySelector<HTMLElement>('[data-studio-member-name]');

function report(message: string) {
  if (status) status.textContent = message;
}

async function boot() {
  try {
    const [member, book] = await Promise.all([currentMember(), currentBook()]);
    if (!member || !book) return window.location.assign('/studio/login');
    if (member.status !== 'active') return report('此会员账户目前未启用；请联系学会确认会籍状态。');
    if (title) title.textContent = book.title || '尚未命名的相册家谱';
    if (memberName) memberName.textContent = `${member.display_name} · ${member.member_id}`;
    if (signout) signout.hidden = false;
    const sections = await allSections(book.id);
    const done = new Set(sections.filter((section) => section.is_complete).map((section) => section.method));
    document.querySelectorAll<HTMLElement>('[data-method]').forEach((item) => {
      const method = Number(item.dataset.method);
      const label = item.querySelector('em');
      if (label) label.textContent = done.has(method) ? '已保存' : '未开始';
      item.classList.toggle('is-complete', done.has(method));
    });
    const passwordPanel = document.querySelector<HTMLElement>('[data-password-change]');
    if (passwordPanel) passwordPanel.hidden = !member.must_change_password;
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
}

signout?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/studio/login');
});

document.querySelector<HTMLFormElement>('[data-password-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const password = String(new FormData(form).get('password') ?? '');
  try {
    await changeInitialPassword(password);
    form.closest<HTMLElement>('[data-password-change]')!.hidden = true;
    report('密码已更新。现在可以开始整理你的相册家谱。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法更新密码。');
  }
});

void boot();
