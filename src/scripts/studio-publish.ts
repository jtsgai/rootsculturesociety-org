import { allSections, currentBook, currentMember, signOut, studioUnavailableMessage } from '../lib/studio';
import { listOwnPublicationRequests, requestChapterPublication, withdrawPublicationRequest, type PublicStoryRequest } from '../lib/member-publication';
import { studioSteps } from '../data/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const form = document.querySelector<HTMLFormElement>('[data-publication-form]');
const methodSelect = document.querySelector<HTMLSelectElement>('[data-publication-method]');
const list = document.querySelector<HTMLElement>('[data-publication-list]');
let bookId = '';
let requests: PublicStoryRequest[] = [];

function report(message: string) {
  if (status) status.textContent = message;
}

function statusLabel(value: PublicStoryRequest['status']) {
  return { draft: '退回修改', pending: '审核中', published: '已发布', withdrawn: '已撤回' }[value];
}

function renderRequests() {
  if (!list) return;
  list.replaceChildren();
  if (!requests.length) {
    list.innerHTML = '<p class="studio-empty">还没有公开申请。你可以先完成一章，再决定是否分享。</p>';
    return;
  }
  requests.forEach((request) => {
    const article = document.createElement('article');
    article.className = 'studio-publication-item';
    const heading = document.createElement('div');
    heading.className = 'studio-publication-item-heading';
    const title = document.createElement('h4');
    title.textContent = request.title;
    const badge = document.createElement('span');
    badge.className = `publication-status is-${request.status}`;
    badge.textContent = statusLabel(request.status);
    heading.append(title, badge);
    const summary = document.createElement('p');
    summary.textContent = String(request.content.summary ?? '');
    article.append(heading, summary);
    if (request.review_note) {
      const note = document.createElement('small');
      note.textContent = `学会备注：${request.review_note}`;
      article.append(note);
    }
    if (request.status === 'pending') {
      const withdraw = document.createElement('button');
      withdraw.className = 'text-link';
      withdraw.type = 'button';
      withdraw.dataset.withdrawRequest = request.id;
      withdraw.textContent = '撤回申请';
      article.append(withdraw);
    }
    list.append(article);
  });
}

function fillMethods(completedMethods: Set<number>) {
  if (!methodSelect) return;
  methodSelect.replaceChildren();
  const available = studioSteps.filter((step) => completedMethods.has(step.method));
  if (!available.length) {
    methodSelect.add(new Option('请先在谱坊完成一章', ''));
    methodSelect.disabled = true;
    if (form) form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = true;
    return;
  }
  methodSelect.add(new Option('请选择一章', ''));
  available.forEach((step) => methodSelect.add(new Option(`${String(step.method).padStart(2, '0')} · ${step.title}`, String(step.method))));
}

async function boot() {
  try {
    const [member, book] = await Promise.all([currentMember(), currentBook()]);
    if (!member || !book) return window.location.assign('/studio/login');
    if (member.status !== 'active') return report('此会员账户目前未启用；请联系学会确认会籍状态。');
    bookId = book.id;
    const sections = await allSections(bookId);
    fillMethods(new Set(sections.filter((section) => section.is_complete).map((section) => section.method)));
    requests = await listOwnPublicationRequests(bookId);
    renderRequests();
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const method = Number(data.get('method'));
  const title = String(data.get('title') ?? '').trim();
  const summary = String(data.get('summary') ?? '').trim();
  if (!bookId || !method || !title || !summary || !data.get('consent')) {
    report('请选择已完成章节，填写标题和公开稿件，并确认已取得同意。');
    return;
  }
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  try {
    if (button) button.disabled = true;
    await requestChapterPublication({ bookId, method, slug: `chapter-${method}-${crypto.randomUUID().slice(0, 8)}`, title, content: { summary }, mediaPaths: [] });
    requests = await listOwnPublicationRequests(bookId);
    renderRequests();
    form.reset();
    report('公开申请已提交，等待学会审核。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法提交公开申请。');
  } finally {
    if (button) button.disabled = false;
  }
});

list?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.closest<HTMLElement>('[data-withdraw-request]')?.dataset.withdrawRequest;
  if (!id || !window.confirm('确定撤回这项公开申请吗？')) return;
  try {
    await withdrawPublicationRequest(id);
    requests = await listOwnPublicationRequests(bookId);
    renderRequests();
    report('公开申请已撤回。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法撤回申请。');
  }
});

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/studio/login');
});

void boot();
