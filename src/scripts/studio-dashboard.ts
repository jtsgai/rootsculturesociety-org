import { getAiQuota } from '../lib/ai';
import { listBookExports, requestBookExport, type BookExport } from '../lib/member-publication';
import {
  allSections,
  changeInitialPassword,
  currentBook,
  currentMember,
  isStudioConfigured,
  signOut,
  studioUnavailableMessage,
} from '../lib/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
const title = document.querySelector<HTMLElement>('[data-studio-book-title]');
const memberName = document.querySelector<HTMLElement>('[data-studio-member-name]');
const continueLink = document.querySelector<HTMLAnchorElement>('[data-studio-continue]');
const progressSummary = document.querySelector<HTMLElement>('[data-studio-progress-summary]');
const tools = document.querySelector<HTMLElement>('[data-studio-tools]');
const aiBalance = document.querySelector<HTMLElement>('[data-ai-balance]');
const aiStatus = document.querySelector<HTMLElement>('[data-ai-status]');
const exportList = document.querySelector<HTMLElement>('[data-export-list]');

function report(message: string) {
  if (status) status.textContent = message;
}

function exportLabel(exportItem: BookExport) {
  const format = exportItem.format === 'pdf' ? 'PDF' : '网页预览';
  const state = { queued: '排队中', running: '生成中', ready: '已完成', failed: '失败' }[exportItem.status];
  return `${format} · ${state}`;
}

function renderExports(items: BookExport[]) {
  if (!exportList) return;
  exportList.replaceChildren();
  if (!items.length) {
    exportList.textContent = '尚未请求导出。';
    return;
  }
  items.slice(0, 4).forEach((item) => {
    const row = document.createElement('p');
    row.textContent = exportLabel(item);
    exportList.append(row);
  });
}

function formatSavedAt(value: string | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

async function loadTools(bookId: string) {
  if (!isStudioConfigured || !tools) return;
  tools.hidden = false;
  try {
    const quota = await getAiQuota();
    if (aiBalance) aiBalance.textContent = String(quota.balance);
  } catch {
    if (aiStatus) aiStatus.textContent = '额度接口尚未启用。';
  }
  try {
    renderExports(await listBookExports(bookId));
  } catch {
    if (exportList) exportList.textContent = '导出接口尚未启用。';
  }
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
    const sectionByMethod = new Map(sections.map((section) => [section.method, section]));
    const completeCount = sections.filter((section) => section.is_complete).length;
    const nextItem = Array.from(document.querySelectorAll<HTMLLIElement>('[data-method]')).find((item) => !sectionByMethod.get(Number(item.dataset.method))?.is_complete);
    const nextLink = nextItem?.querySelector<HTMLAnchorElement>('a');
    const nextTitle = nextItem?.querySelector('strong')?.textContent?.trim();
    if (continueLink && nextLink && nextTitle) {
      continueLink.href = nextLink.href;
      continueLink.replaceChildren(document.createTextNode(`继续：${nextTitle} `), Object.assign(document.createElement('span'), { textContent: '↗' }));
    } else if (continueLink) {
      continueLink.href = '/studio/1-cover';
      continueLink.textContent = '查看封面 ↗';
    }
    if (progressSummary) {
      const latest = sections.map((section) => section.updated_at).filter(Boolean).sort().at(-1);
      const savedText = latest ? `最近保存：${formatSavedAt(latest)}` : '尚未保存任何章节';
      progressSummary.textContent = `已完成 ${completeCount} / 8 章；${nextTitle ? `下一步：${nextTitle}` : '八章都已标记完成'}。${savedText}`;
    }
    document.querySelectorAll<HTMLElement>('[data-method]').forEach((item) => {
      const method = Number(item.dataset.method);
      const label = item.querySelector('em');
      const section = sectionByMethod.get(method);
      if (label) label.textContent = section?.is_complete ? '已完成' : section ? '可继续' : '未开始';
      item.classList.toggle('is-complete', Boolean(section?.is_complete));
      item.classList.toggle('is-started', Boolean(section && !section.is_complete));
    });
    await loadTools(book.id);
    const passwordPanel = document.querySelector<HTMLElement>('[data-password-change]');
    if (passwordPanel) passwordPanel.hidden = !member.must_change_password;
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-export-format]').forEach((button) => {
  button.addEventListener('click', async () => {
    const book = await currentBook();
    const format = button.dataset.exportFormat;
    if (!book || (format !== 'web' && format !== 'pdf')) return;
    button.disabled = true;
    report('正在提交导出请求…');
    try {
      await requestBookExport(book.id, format);
      renderExports(await listBookExports(book.id));
      report('导出请求已记录；完成后会显示状态。');
    } catch (error) {
      report(error instanceof Error ? error.message : '无法提交导出请求。');
    } finally {
      button.disabled = false;
    }
  });
});

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
