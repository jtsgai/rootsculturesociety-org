import { createActivityEvent, deleteActivityEvent, listActivityEvents, updateActivityEvent, type ActivityEvent } from '../lib/activity-events';
import { currentProfile, signOut, studioUnavailableMessage } from '../lib/studio';

const root = document.querySelector<HTMLElement>('[data-admin-events]');
const form = document.querySelector<HTMLFormElement>('[data-activity-event-form]');
const list = document.querySelector<HTMLElement>('[data-activity-event-list]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const cancel = document.querySelector<HTMLButtonElement>('[data-event-cancel]');
const submit = document.querySelector<HTMLButtonElement>('[data-event-submit]');
let events: ActivityEvent[] = [];

function report(message: string) {
  if (status) status.textContent = message;
}

function field(name: string) {
  return form?.elements.namedItem(name);
}

function inputValue(name: string) {
  const input = field(name);
  return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input.value.trim() : '';
}

function setValue(name: string, value: string | number | null | undefined) {
  const input = field(name);
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.value = value == null ? '' : String(value);
}

function setChecked(name: string, value: boolean) {
  const input = field(name);
  if (input instanceof HTMLInputElement) input.checked = value;
}

function resetForm() {
  form?.reset();
  setValue('id', '');
  setValue('sortOrder', 100);
  setValue('sourceLabelZh', '查看活动资料');
  setValue('sourceLabelEn', 'View activity record');
  setChecked('isPublished', true);
  if (cancel) cancel.hidden = true;
  if (submit) submit.textContent = '保存活动记录';
  const heading = document.querySelector<HTMLElement>('#admin-event-editor-title');
  if (heading) heading.textContent = '新增活动记录';
}

function editEvent(event: ActivityEvent) {
  setValue('id', event.id);
  setValue('titleZh', event.title_zh);
  setValue('titleEn', event.title_en);
  setValue('dateLabelZh', event.date_label_zh);
  setValue('dateLabelEn', event.date_label_en);
  setValue('eventDate', event.event_date);
  setValue('sortOrder', event.sort_order);
  setValue('locationZh', event.location_zh);
  setValue('locationEn', event.location_en);
  setValue('imagePath', event.image_path);
  setValue('imageAltZh', event.image_alt_zh);
  setValue('imageAltEn', event.image_alt_en);
  setValue('summaryZh', event.summary_zh);
  setValue('summaryEn', event.summary_en);
  setValue('sourceUrl', event.source_url);
  setValue('sourceLabelZh', event.source_label_zh || '查看活动资料');
  setValue('sourceLabelEn', event.source_label_en || 'View activity record');
  setChecked('isPublished', event.is_published);
  if (cancel) cancel.hidden = false;
  if (submit) submit.textContent = '保存活动修改';
  const heading = document.querySelector<HTMLElement>('#admin-event-editor-title');
  if (heading) heading.textContent = '编辑活动记录';
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function button(label: string, action: string, id: string) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = action === 'delete' ? 'text-link admin-event-delete' : 'text-link';
  item.dataset.eventAction = action;
  item.dataset.eventId = id;
  item.textContent = label;
  return item;
}

function render() {
  if (!list) return;
  list.replaceChildren();
  if (!events.length) {
    list.innerHTML = '<p class="studio-empty">目前还没有活动记录。</p>';
    return;
  }
  events.forEach((event) => {
    const article = document.createElement('article');
    article.className = 'admin-event-item';
    if (!event.is_published) article.classList.add('is-draft');
    const copy = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'admin-section-label';
    label.textContent = `${event.date_label_zh || event.event_date || '未设日期'} · ${event.is_published ? '已公开' : '草稿'}`;
    const title = document.createElement('h4');
    title.textContent = event.title_zh;
    const english = document.createElement('p');
    english.className = 'admin-event-english';
    english.textContent = event.title_en;
    const summary = document.createElement('p');
    summary.textContent = event.summary_zh;
    copy.append(label, title, english, summary);
    const actions = document.createElement('div');
    actions.className = 'admin-event-actions';
    actions.append(button('编辑', 'edit', event.id), button('删除', 'delete', event.id));
    article.append(copy, actions);
    list.append(article);
  });
}

async function load(message = '') {
  events = await listActivityEvents();
  render();
  if (message) report(message);
}

function payload() {
  const checked = field('isPublished');
  return {
    slug: inputValue('id') ? undefined : `event-${crypto.randomUUID()}`,
    title_zh: inputValue('titleZh'),
    title_en: inputValue('titleEn'),
    summary_zh: inputValue('summaryZh'),
    summary_en: inputValue('summaryEn'),
    event_date: inputValue('eventDate') || null,
    date_label_zh: inputValue('dateLabelZh') || null,
    date_label_en: inputValue('dateLabelEn') || null,
    location_zh: inputValue('locationZh') || null,
    location_en: inputValue('locationEn') || null,
    image_path: inputValue('imagePath') || null,
    image_alt_zh: inputValue('imageAltZh') || null,
    image_alt_en: inputValue('imageAltEn') || null,
    source_url: inputValue('sourceUrl') || null,
    source_label_zh: inputValue('sourceLabelZh') || null,
    source_label_en: inputValue('sourceLabelEn') || null,
    is_published: checked instanceof HTMLInputElement && checked.checked,
    sort_order: Number(inputValue('sortOrder')) || 100,
  };
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = inputValue('id');
  try {
    if (submit) {
      submit.disabled = true;
      submit.textContent = id ? '正在保存修改…' : '正在保存…';
    }
    const values = payload();
    if (id) {
      delete values.slug;
      await updateActivityEvent(id, values);
      await load('活动记录已更新。');
    } else {
      await createActivityEvent(values);
      await load('活动记录已建立。');
    }
    resetForm();
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存活动记录。请确认活动资料数据库已启用。');
  } finally {
    if (submit) {
      submit.disabled = false;
      if (!inputValue('id')) submit.textContent = '保存活动记录';
    }
  }
});

cancel?.addEventListener('click', resetForm);

list?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.eventId;
  const action = target.dataset.eventAction;
  const selected = events.find((item) => item.id === id);
  if (!id || !selected) return;
  if (action === 'edit') {
    editEvent(selected);
    return;
  }
  if (action === 'delete') {
    if (!window.confirm(`确定删除“${selected.title_zh}”吗？删除后不可恢复。`)) return;
    try {
      target.disabled = true;
      await deleteActivityEvent(id);
      await load('活动记录已删除。');
    } catch (error) {
      report(error instanceof Error ? error.message : '无法删除活动记录。');
      target.disabled = false;
    }
  }
});

document.querySelector<HTMLButtonElement>('[data-event-refresh]')?.addEventListener('click', async () => {
  try {
    await load('活动列表已更新。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法读取活动资料。');
  }
});

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/admin/login');
});

void (async () => {
  try {
    const profile = await currentProfile();
    if (!profile || profile.role !== 'admin') {
      await signOut();
      return window.location.assign('/admin/login');
    }
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
    await load();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
