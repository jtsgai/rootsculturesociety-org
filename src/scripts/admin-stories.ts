import { listPublicationQueue, reviewPublicationRequest, type PublicStoryRequest } from '../lib/member-publication';
import { currentProfile, signOut, studioUnavailableMessage } from '../lib/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const queue = document.querySelector<HTMLElement>('[data-admin-story-queue]');
let requests: PublicStoryRequest[] = [];

function report(message: string) {
  if (status) status.textContent = message;
}

function methodLabel(method: number) {
  return `第 ${String(method).padStart(2, '0')} 章`;
}

function renderQueue() {
  if (!queue) return;
  queue.replaceChildren();
  if (!requests.length) {
    queue.innerHTML = '<p class="studio-empty">目前没有待处理的公开申请。</p>';
    return;
  }
  requests.forEach((request) => {
    const article = document.createElement('article');
    article.className = 'admin-story-item';
    const heading = document.createElement('div');
    heading.className = 'admin-story-item-heading';
    const title = document.createElement('h4');
    title.textContent = request.title;
    const meta = document.createElement('span');
    meta.textContent = `${request.member_id} · ${methodLabel(request.method)} · ${request.status === 'pending' ? '待审核' : '已撤回'}`;
    heading.append(title, meta);
    const summary = document.createElement('p');
    summary.textContent = String(request.content.summary ?? '');
    const note = document.createElement('textarea');
    note.rows = 3;
    note.placeholder = '退回或拒绝时写给会员的说明（可选）';
    note.value = request.review_note ?? '';
    note.dataset.reviewNote = request.id;
    const actions = document.createElement('div');
    actions.className = 'admin-story-actions';
    ['published', 'draft', 'withdrawn'].forEach((action) => {
      const button = document.createElement('button');
      button.className = action === 'published' ? 'button' : 'text-link';
      button.type = 'button';
      button.dataset.reviewAction = action;
      button.dataset.reviewId = request.id;
      button.textContent = action === 'published' ? '批准发布' : action === 'draft' ? '退回修改' : '拒绝申请';
      actions.append(button);
    });
    article.append(heading, summary, note, actions);
    queue.append(article);
  });
}

async function loadQueue(message = '') {
  requests = await listPublicationQueue();
  renderQueue();
  if (message) report(message);
}

queue?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.reviewAction as 'published' | 'draft' | 'withdrawn' | undefined;
  const id = target.dataset.reviewId;
  if (!action || !id) return;
  const note = queue.querySelector<HTMLTextAreaElement>(`[data-review-note="${id}"]`)?.value.trim() || null;
  if (action !== 'published' && !note) {
    report('请先写下退回或拒绝的原因，会员才知道如何处理。');
    return;
  }
  try {
    target.disabled = true;
    await reviewPublicationRequest(id, action, note);
    await loadQueue(action === 'published' ? '故事已批准发布。' : '申请处理完成，会员可以看到审核备注。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法更新公开申请。');
  } finally {
    target.disabled = false;
  }
});

document.querySelector<HTMLButtonElement>('[data-admin-story-refresh]')?.addEventListener('click', async () => {
  try {
    await loadQueue('审核队列已更新。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法读取审核队列。');
  }
});

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/admin/login');
});

void (async () => {
  try {
    const profile = await currentProfile();
    if (!profile) return window.location.assign('/admin/login');
    if (profile.role !== 'admin') {
      await signOut();
      return window.location.assign('/admin/login');
    }
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
    await loadQueue();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
