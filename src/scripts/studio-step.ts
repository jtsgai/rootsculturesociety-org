import { addPerson, currentBook, currentMember, getSection, listPeople, saveBook, saveSection, studioUnavailableMessage, updatePerson } from '../lib/studio';

const container = document.querySelector<HTMLElement>('[data-studio-step]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const method = Number(container?.dataset.studioStep ?? 0);
const type = container?.dataset.stepType;
let bookId = '';

function report(message: string) {
  if (status) status.textContent = message;
}

function stringOrNull(value: FormDataEntryValue | null) {
  const string = String(value ?? '').trim();
  return string || null;
}

async function ensureMember() {
  const [member, book] = await Promise.all([currentMember(), currentBook()]);
  if (!member || !book) {
    window.location.assign('/studio/login');
    return false;
  }
  if (member.status !== 'active') {
    report('此会员账户目前未启用；请联系学会确认会籍状态。');
    return false;
  }
  bookId = book.id;
  const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
  if (signout) signout.hidden = false;
  return true;
}

function renderPeople(people: Awaited<ReturnType<typeof listPeople>>, register = false) {
  const target = document.querySelector<HTMLElement>(register ? '[data-register-list]' : '[data-person-list]');
  if (!target) return;
  if (!people.length) {
    target.innerHTML = '<p class="studio-empty">还没有资料。先从最确定的一位家人开始。</p>';
    return;
  }
  target.innerHTML = people.map((person) => register
    ? `<form class="studio-person-row" data-register-person="${person.id}"><div><strong>${escapeHtml(person.name)}</strong><small>第 ${person.generation_number} 代</small></div><label>职业<input name="occupation" value="${escapeAttribute(person.occupation)}"></label><label>教育<input name="education" value="${escapeAttribute(person.education)}"></label><label>电话（仅本人及管理员）<input name="phone" value="${escapeAttribute(person.phone)}"></label><label>地址（仅本人及管理员）<input name="address" value="${escapeAttribute(person.address)}"></label><button class="text-link" type="submit">保存</button></form>`
    : `<article class="studio-person-row"><div><strong>${escapeHtml(person.name)}</strong><small>第 ${person.generation_number} 代 · ${lifeStatus(person.life_status)}</small></div><p>${escapeHtml(person.note || '尚未填写人物小记。')}</p></article>`).join('');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
}

function escapeAttribute(value: string | null) {
  return escapeHtml(value ?? '');
}

function lifeStatus(value: string | null) {
  return value === 'living' ? '在世' : value === 'deceased' ? '已故' : '状态未注明';
}

async function fillSavedContent() {
  if (!bookId) return;
  const section = await getSection(bookId, method);
  const content = section?.content ?? {};
  const form = document.querySelector<HTMLFormElement>('[data-section-form]');
  if (type === 'cover' && form) {
    const book = await currentBook();
    const fields: Record<string, string | null | undefined> = { title: book?.title, ancestor: book?.generation_one_ancestor, dialect: (content.dialect as string) ?? '', ancestralPlace: (content.ancestralPlace as string) ?? '', dedication: (content.dedication as string) ?? '' };
    Object.entries(fields).forEach(([name, value]) => { const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null; if (field) field.value = value ?? ''; });
    const consent = form.elements.namedItem('consent') as HTMLInputElement | null;
    if (consent) consent.checked = Boolean(book?.consent_at);
  }
  if (type === 'notes' && form) {
    const notes = form.elements.namedItem('notes') as HTMLTextAreaElement | null;
    const imageNotes = form.elements.namedItem('imageNotes') as HTMLTextAreaElement | null;
    const complete = form.elements.namedItem('complete') as HTMLInputElement | null;
    if (notes) notes.value = String(content.notes ?? '');
    if (imageNotes) imageNotes.value = String(content.imageNotes ?? '');
    if (complete) complete.checked = Boolean(section?.is_complete);
  }
}

document.querySelector<HTMLFormElement>('[data-section-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  try {
    if (!bookId) throw new Error('请先登录。');
    if (type === 'cover') {
      const title = stringOrNull(data.get('title'));
      const ancestor = stringOrNull(data.get('ancestor'));
      if (!title || !ancestor || !data.get('consent')) throw new Error('请填写书名、开族始祖，并确认已取得资料授权。');
      await saveBook(bookId, { title, generation_one_ancestor: ancestor, dialect_group: stringOrNull(data.get('dialect')), ancestral_place: stringOrNull(data.get('ancestralPlace')), dedication: stringOrNull(data.get('dedication')), consent_at: new Date().toISOString() });
      await saveSection(bookId, method, { dialect: stringOrNull(data.get('dialect')) ?? '', ancestralPlace: stringOrNull(data.get('ancestralPlace')) ?? '', dedication: stringOrNull(data.get('dedication')) ?? '' }, true);
    } else {
      const content = { notes: stringOrNull(data.get('notes')) ?? '', imageNotes: stringOrNull(data.get('imageNotes')) ?? '' };
      await saveSection(bookId, method, content, Boolean(data.get('complete')));
    }
    report('已保存。你可以继续补充，资料不会公开显示。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存，请稍后重试。');
  }
});

document.querySelector<HTMLFormElement>('[data-person-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  try {
    if (!bookId) throw new Error('请先登录。');
    const name = stringOrNull(data.get('name'));
    const generation = Number(data.get('generation'));
    if (!name || !Number.isInteger(generation) || generation < 1) throw new Error('请填写姓名与正确的世代。');
    const birthYear = Number(data.get('birthYear')) || null;
    await addPerson(bookId, { name, generation_number: generation, sex: String(data.get('sex') || 'unspecified'), life_status: String(data.get('lifeStatus') || 'unspecified'), birth_year: birthYear, occupation: null, education: null, phone: null, address: null, note: stringOrNull(data.get('note')) });
    await saveSection(bookId, method, {}, true);
    form.reset();
    renderPeople(await listPeople(bookId));
    report('已加入世系。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存人物。');
  }
});

document.querySelector<HTMLElement>('[data-register-list]')?.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.registerPerson) return;
  event.preventDefault();
  try {
    const values = new FormData(form);
    await updatePerson(form.dataset.registerPerson, { occupation: stringOrNull(values.get('occupation')), education: stringOrNull(values.get('education')), phone: stringOrNull(values.get('phone')), address: stringOrNull(values.get('address')) });
    await saveSection(bookId, method, {}, true);
    report('族人资料已保存。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存。');
  }
});

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  const { signOut } = await import('../lib/studio');
  await signOut();
  window.location.assign('/studio/login');
});

void (async () => {
  try {
    if (!(await ensureMember())) return;
    await fillSavedContent();
    if (type === 'people') renderPeople(await listPeople(bookId));
    if (type === 'register') renderPeople(await listPeople(bookId), true);
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
