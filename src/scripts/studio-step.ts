import { addPerson, currentBook, currentMember, getSection, listMedia, listPeople, removeMedia, saveBook, saveSection, studioUnavailableMessage, updateMediaCaption, uploadMedia, type StudioMedia, updatePerson } from '../lib/studio';

const container = document.querySelector<HTMLElement>('[data-studio-step]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const method = Number(container?.dataset.studioStep ?? 0);
const type = container?.dataset.stepType;
let bookId = '';
let mediaItems: StudioMedia[] = [];

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

function rowValue(row: Record<string, string>, key: string) {
  return escapeAttribute(row[key] ?? '');
}

function repeatRow(kind: string, row: Record<string, string> = {}) {
  const fields = kind === 'migrationRows'
    ? `<label>地点<input name="place" value="${rowValue(row, 'place')}" placeholder="例如：新加坡芽笼" /></label><label>年份（可选）<input name="year" value="${rowValue(row, 'year')}" placeholder="例如：1958" /></label><label>这一站发生了什么<textarea name="note" rows="3" placeholder="为什么来到这里？">${rowValue(row, 'note')}</textarea></label>`
    : kind === 'childhoodRows'
      ? `<label>年代或年份<input name="year" value="${rowValue(row, 'year')}" placeholder="例如：1960 年代" /></label><label>新加坡地点<input name="place" value="${rowValue(row, 'place')}" placeholder="例如：实龙岗" /></label><label>记忆<textarea name="note" rows="3" placeholder="一件具体的小事就很好。">${rowValue(row, 'note')}</textarea></label>`
      : `<label>菜名<input name="dish" value="${rowValue(row, 'dish')}" placeholder="例如：海南鸡饭" /></label><label>材料<textarea name="ingredients" rows="3" placeholder="写下主要材料。">${rowValue(row, 'ingredients')}</textarea></label><label>做法<textarea name="method" rows="3" placeholder="按家里习惯写即可。">${rowValue(row, 'method')}</textarea></label><label>谁教会你的？<input name="taughtBy" value="${rowValue(row, 'taughtBy')}" /></label>`;
  return `<div class="studio-repeat-row" data-repeat-row="${kind}">${fields}<button class="text-link studio-remove-row" type="button" data-remove-row>移除这一项</button></div>`;
}

function renderStructuredFields(method: number, content: Record<string, unknown>) {
  const target = document.querySelector<HTMLElement>('[data-structured-fields]');
  if (!target) return;
  if (method === 2) {
    target.innerHTML = `<div class="studio-fields"><label>姓氏或家族线索<input name="surname" value="${escapeAttribute(String(content.surname ?? ''))}" placeholder="例如：黄姓、家中旧称呼" /></label><label>祖籍地<input name="ancestralPlace" value="${escapeAttribute(String(content.ancestralPlace ?? ''))}" placeholder="例如：中国海南文昌" /></label></div><label>家中流传的故事<textarea name="story" rows="8" placeholder="没有文献也没关系，先写家人知道的事。">${escapeHtml(String(content.story ?? content.notes ?? ''))}</textarea><label>资料来源或待查线索<textarea name="sources" rows="4" placeholder="口述者、书籍、旧文件或以后想查的方向。">${escapeHtml(String(content.sources ?? content.imageNotes ?? ''))}</textarea>`;
  } else if (method === 3) {
    target.innerHTML = `<div class="studio-repeat-group" data-repeat-group="migrationRows"><div class="studio-repeat-list" data-repeat-list></div><button class="text-link" type="button" data-add-row>＋ 添加一站</button></div><label>补充说明<textarea name="notes" rows="5" placeholder="还有哪些迁徙线索、口述或待查资料？">${escapeHtml(String(content.notes ?? ''))}</textarea>`;
    renderRows('migrationRows', Array.isArray(content.migrationRows) ? content.migrationRows as Record<string, string>[] : []);
  } else if (method === 4) {
    target.innerHTML = `<div class="studio-fields"><label>方言群<input name="dialect" value="${escapeAttribute(String(content.dialect ?? ''))}" placeholder="例如：海南、福建、潮州" /></label><label>堂号<input name="hallName" value="${escapeAttribute(String(content.hallName ?? ''))}" placeholder="知道才填写" /></label><label>祖屋、祖庙或会馆<input name="places" value="${escapeAttribute(String(content.places ?? ''))}" /></label></div><label>家中的文化习惯<textarea name="notes" rows="8" placeholder="节日、称呼、信仰、语言或家中一直保留的习惯。">${escapeHtml(String(content.notes ?? ''))}</textarea>`;
  } else if (method === 6) {
    target.innerHTML = `<div class="studio-repeat-group" data-repeat-group="childhoodRows"><div class="studio-repeat-list" data-repeat-list></div><button class="text-link" type="button" data-add-row>＋ 添加一段记忆</button></div><label>补充说明<textarea name="notes" rows="5" placeholder="还有哪些童年线索值得留下？">${escapeHtml(String(content.notes ?? ''))}</textarea>`;
    renderRows('childhoodRows', Array.isArray(content.childhoodRows) ? content.childhoodRows as Record<string, string>[] : []);
  } else if (method === 7) {
    target.innerHTML = `<div class="studio-repeat-group" data-repeat-group="dishRows"><div class="studio-repeat-list" data-repeat-list></div><button class="text-link" type="button" data-add-row>＋ 添加一道家肴</button></div><label>补充说明<textarea name="notes" rows="5" placeholder="还有哪些家肴、节令或餐桌记忆？">${escapeHtml(String(content.notes ?? ''))}</textarea>`;
    renderRows('dishRows', Array.isArray(content.dishRows) ? content.dishRows as Record<string, string>[] : []);
  }
}

function renderRows(kind: string, rows: Record<string, string>[]) {
  const group = document.querySelector<HTMLElement>(`[data-repeat-group="${kind}"]`);
  const list = group?.querySelector<HTMLElement>('[data-repeat-list]');
  if (!list) return;
  list.innerHTML = rows.length ? rows.map((row) => repeatRow(kind, row)).join('') : '<p class="studio-empty">还没有记录。可以先添加一项。</p>';
}

function collectRows(kind: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-repeat-row="${kind}"]`)).map((row) => {
    const values: Record<string, string> = {};
    row.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => { values[field.name] = field.value.trim(); });
    return values;
  });
}

function structuredContent(form: HTMLFormElement) {
  const data = new FormData(form);
  if (method === 2) return { surname: stringOrNull(data.get('surname')) ?? '', ancestralPlace: stringOrNull(data.get('ancestralPlace')) ?? '', story: stringOrNull(data.get('story')) ?? '', sources: stringOrNull(data.get('sources')) ?? '' };
  if (method === 3) return { migrationRows: collectRows('migrationRows'), notes: stringOrNull(data.get('notes')) ?? '' };
  if (method === 4) return { dialect: stringOrNull(data.get('dialect')) ?? '', hallName: stringOrNull(data.get('hallName')) ?? '', places: stringOrNull(data.get('places')) ?? '', notes: stringOrNull(data.get('notes')) ?? '' };
  if (method === 6) return { childhoodRows: collectRows('childhoodRows'), notes: stringOrNull(data.get('notes')) ?? '' };
  if (method === 7) return { dishRows: collectRows('dishRows'), notes: stringOrNull(data.get('notes')) ?? '' };
  return { notes: stringOrNull(data.get('notes')) ?? '', imageNotes: stringOrNull(data.get('imageNotes')) ?? '' };
}

function renderMedia(items: StudioMedia[]) {
  const list = document.querySelector<HTMLElement>('[data-media-list]');
  if (!list) return;
  list.replaceChildren();
  if (!items.length) {
    list.innerHTML = '<p class="studio-empty">尚未上传图片。</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('figure');
    card.className = 'studio-media-item';
    card.dataset.mediaId = item.id;
    const image = document.createElement('img');
    image.src = item.signed_url ?? '';
    image.alt = item.caption || '会员私密图片';
    image.loading = 'lazy';
    const controls = document.createElement('div');
    controls.className = 'studio-media-controls';
    const caption = document.createElement('input');
    caption.value = item.caption ?? '';
    caption.placeholder = '图片说明（可选）';
    caption.dataset.mediaCaption = '';
    const save = document.createElement('button');
    save.className = 'text-link';
    save.type = 'button';
    save.dataset.mediaSave = '';
    save.textContent = '保存说明';
    const remove = document.createElement('button');
    remove.className = 'text-link media-remove';
    remove.type = 'button';
    remove.dataset.mediaRemove = '';
    remove.textContent = '删除图片';
    controls.append(caption, save, remove);
    card.append(image, controls);
    list.append(card);
  });
}

async function loadMedia() {
  const picker = document.querySelector<HTMLElement>('[data-media-picker]');
  if (!picker || !bookId) return;
  try {
    mediaItems = await listMedia(bookId, method);
    renderMedia(mediaItems);
  } catch {
    const mediaStatus = picker.querySelector<HTMLElement>('[data-media-status]');
    if (mediaStatus) mediaStatus.textContent = '图片功能正在启用，文字资料仍可正常保存。';
  }
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
    renderStructuredFields(method, content);
    const notes = form.elements.namedItem('notes') as HTMLTextAreaElement | null;
    const imageNotes = form.elements.namedItem('imageNotes') as HTMLTextAreaElement | null;
    const complete = form.elements.namedItem('complete') as HTMLInputElement | null;
    if (notes) notes.value = String(content.notes ?? '');
    if (imageNotes) imageNotes.value = String(content.imageNotes ?? '');
    if (complete) complete.checked = Boolean(section?.is_complete);
  }
}

document.querySelector<HTMLElement>('[data-structured-fields]')?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('[data-add-row]')) {
    const group = target.closest<HTMLElement>('[data-repeat-group]');
    const kind = group?.dataset.repeatGroup;
    const list = group?.querySelector<HTMLElement>('[data-repeat-list]');
    if (!kind || !list) return;
    list.querySelector('.studio-empty')?.remove();
    list.insertAdjacentHTML('beforeend', repeatRow(kind));
  }
  if (target.closest('[data-remove-row]')) {
    target.closest<HTMLElement>('[data-repeat-row]')?.remove();
    const group = target.closest<HTMLElement>('[data-repeat-group]');
    const list = group?.querySelector<HTMLElement>('[data-repeat-list]');
    if (list && !list.children.length) list.innerHTML = '<p class="studio-empty">还没有记录。可以先添加一项。</p>';
  }
});

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
      const content = structuredContent(form);
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

document.querySelector<HTMLInputElement>('[data-media-input]')?.addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const picker = input.closest<HTMLElement>('[data-media-picker]');
  const mediaStatus = picker?.querySelector<HTMLElement>('[data-media-status]');
  if (!bookId || !input.files?.length) return;
  try {
    input.disabled = true;
    for (const file of Array.from(input.files)) {
      if (mediaStatus) mediaStatus.textContent = `正在保存 ${file.name}…`;
      await uploadMedia(bookId, method, file);
    }
    input.value = '';
    await loadMedia();
    if (mediaStatus) mediaStatus.textContent = '图片已保存，默认只对你和学会资料管理员可见。';
  } catch (error) {
    if (mediaStatus) mediaStatus.textContent = error instanceof Error ? error.message : '无法保存图片。';
  } finally {
    input.disabled = false;
  }
});

document.querySelector<HTMLElement>('[data-media-list]')?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const card = target.closest<HTMLElement>('[data-media-id]');
  const item = mediaItems.find((media) => media.id === card?.dataset.mediaId);
  if (!card || !item) return;
  const mediaStatus = document.querySelector<HTMLElement>('[data-media-status]');
  try {
    if (target.closest('[data-media-save]')) {
      const caption = card.querySelector<HTMLInputElement>('[data-media-caption]')?.value.trim() ?? '';
      await updateMediaCaption(item.id, caption || null);
      item.caption = caption || null;
      if (mediaStatus) mediaStatus.textContent = '图片说明已保存。';
    }
    if (target.closest('[data-media-remove]')) {
      if (!window.confirm('确定删除这张私密图片吗？')) return;
      await removeMedia(item);
      mediaItems = mediaItems.filter((media) => media.id !== item.id);
      renderMedia(mediaItems);
      if (mediaStatus) mediaStatus.textContent = '图片已删除。';
    }
  } catch (error) {
    if (mediaStatus) mediaStatus.textContent = error instanceof Error ? error.message : '图片操作失败。';
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
    await loadMedia();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
