import { addPerson, currentBook, currentMember, deletePerson, getSection, listMedia, listPeople, removeMedia, saveBook, saveSection, studioUnavailableMessage, updateMediaCaption, uploadMedia, type StudioMedia, type StudioPerson, updatePerson } from '../lib/studio';
import { branchChildSummary, buildLineageGenerations, buildLineageGrid, familyBranchLabel, genealogyMarkerLabels, lineageLegendMarkup, orderedFamilyMembers, parentBranchIds, personDisplayName, personLifespan, personMarkerSymbols, personResidenceCode, personSexLabel, siblingsOf } from '../lib/lineage';
import { drawLineageConnections } from '../lib/lineage-connections';

const container = document.querySelector<HTMLElement>('[data-studio-step]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const method = Number(container?.dataset.studioStep ?? 0);
const type = container?.dataset.stepType;
let bookId = '';
let mediaItems: StudioMedia[] = [];
let peopleItems: StudioPerson[] = [];

function report(message: string) {
  if (status) status.textContent = message;
}

function setSaveState(form: HTMLFormElement, complete: boolean, label: string) {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button) return;
  button.textContent = label;
  button.classList.toggle('is-complete', complete);
}

function watchForEdits(form: HTMLFormElement, defaultLabel: string) {
  form.addEventListener('input', () => {
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button?.classList.contains('is-complete')) return;
    button.textContent = defaultLabel === '保存封面' ? '保存修改' : '保存这一章';
    button.classList.remove('is-complete');
  });
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

function personOptions(people: StudioPerson[], current: StudioPerson, selectedId: string | null, emptyLabel: string, relation: 'father' | 'mother' | 'spouse') {
  const options = people.filter((person) => {
    if (person.id === current.id) return false;
    if (relation === 'father') return person.sex === 'male' && person.generation_number === current.generation_number - 1;
    if (relation === 'mother') return person.sex === 'female' && person.generation_number === current.generation_number - 1;
    return person.generation_number === current.generation_number;
  }).map((person) => `<option value="${person.id}"${person.id === selectedId ? ' selected' : ''}>第 ${person.generation_number} 代 · ${escapeHtml(person.name)}（${personSexLabel(person)}）</option>`).join('');
  return `<option value="">${emptyLabel}</option>${options}`;
}

function markerCheckboxes(person: StudioPerson) {
  return Object.entries(genealogyMarkerLabels).map(([value, marker]) => `<label><input type="checkbox" name="markers" value="${value}"${person.genealogy_markers?.includes(value) ? ' checked' : ''}> <b>${marker.symbol}</b> ${marker.label}</label>`).join('');
}

function renderPersonEditor(person: StudioPerson, people: StudioPerson[]) {
  return `<form class="studio-person-row studio-person-edit" data-person-edit="${person.id}"><div class="studio-person-identity"><strong>${escapeHtml(person.name)}</strong><small>第 ${person.generation_number} 代 · ${personSexLabel(person)} · ${lifeStatus(person.life_status)}</small><p>${escapeHtml(person.note || '尚未填写人物小记。')}</p></div><div class="studio-person-edit-fields"><div class="studio-fields"><label>姓名<input name="name" value="${escapeAttribute(person.name)}" required /></label><label>世代<input name="generation" type="number" min="1" value="${person.generation_number}" required /></label><label>性别<select name="sex"><option value="unspecified"${person.sex === 'unspecified' ? ' selected' : ''}>不注明</option><option value="female"${person.sex === 'female' ? ' selected' : ''}>女</option><option value="male"${person.sex === 'male' ? ' selected' : ''}>男</option></select></label><label>状态<select name="lifeStatus"><option value="unspecified"${person.life_status === 'unspecified' ? ' selected' : ''}>不注明</option><option value="living"${person.life_status === 'living' ? ' selected' : ''}>在世</option><option value="deceased"${person.life_status === 'deceased' ? ' selected' : ''}>已故</option></select></label><label>出生日期<input name="birthDate" type="date" value="${escapeAttribute(person.birth_date)}" /></label><label>去世日期<input name="deathDate" type="date" value="${escapeAttribute(person.death_date)}" /></label><label>现居地缩写<select name="residenceCode"><option value="">不标注</option>${['S', 'M', 'HK', 'UK', 'US'].map((code) => `<option value="${code}"${person.residence_code === code ? ' selected' : ''}>${code}</option>`).join('')}</select></label></div><div class="studio-fields"><label>父亲（只列上一代男性）<select name="fatherId">${personOptions(people, person, person.father_id, '未选择', 'father')}</select></label><label>母亲（只列上一代女性）<select name="motherId">${personOptions(people, person, person.mother_id, '未选择', 'mother')}</select></label><label>配偶（只列同一代）<select name="spouseId">${personOptions(people, person, person.spouse_id, '未选择', 'spouse')}</select></label></div><fieldset class="studio-marker-fields"><legend>谱系标注</legend>${markerCheckboxes(person)}</fieldset><label>人物小记<textarea name="note" rows="3">${escapeHtml(person.note || '')}</textarea></label><div class="studio-person-actions"><button class="text-link" type="submit">保存人物与关系</button><button class="text-link media-remove" type="button" data-delete-person>删除人物</button></div></div></form>`;
}

function renderPeople(people: StudioPerson[], register = false) {
  peopleItems = people;
  const target = document.querySelector<HTMLElement>(register ? '[data-register-list]' : '[data-person-list]');
  if (!target) return;
  target.setAttribute('aria-busy', 'false');
  if (!people.length) {
    target.innerHTML = '<p class="studio-empty">还没有资料。先从最确定的一位家人开始。</p>';
    if (!register) renderLineage([]);
    return;
  }
  target.innerHTML = register ? renderRegisterRows(people) : people.map((person) => renderPersonEditor(person, people)).join('');
  if (!register) renderLineage(people);
}

function renderRegisterRows(people: StudioPerson[]) {
  return buildLineageGenerations(people).map((record) => record.branches.map((branch, branchIndex) => {
    const heading = `<div class="studio-register-family-heading"><span>第 ${record.generation} 代 · 家庭支系 ${branchIndex + 1}</span><strong>${escapeHtml(familyBranchLabel(branch))}</strong></div>`;
    const rows = orderedFamilyMembers(branch.members).map((person) => `<form class="studio-person-row" data-register-person="${person.id}"><div><strong>${escapeHtml(person.name)}</strong><small>第 ${person.generation_number} 代 · ${personSexLabel(person)} · ${escapeHtml(personLifespan(person) || '生卒未填写')}</small><small class="studio-person-relation">${escapeHtml(relationSummary(person, people))}</small></div><label>职业<input name="occupation" value="${escapeAttribute(person.occupation)}" autocomplete="organization-title"></label><label>教育<input name="education" value="${escapeAttribute(person.education)}" autocomplete="off"></label><label>电话（私密）<input name="privatePhone" value="${escapeAttribute(person.phone)}" autocomplete="off"></label><label>地址（私密）<input name="privateAddress" value="${escapeAttribute(person.address)}" autocomplete="off"></label><button class="text-link" type="submit">保存</button></form>`).join('');
    return `${heading}${rows}`;
  }).join('')).join('');
}

function relationSummary(person: StudioPerson, people: StudioPerson[], includeSpouse = true) {
  const siblings = siblingsOf(person, people);
  const relations = [
    person.father_id ? `父：${people.find((item) => item.id === person.father_id)?.name ?? '未注明'}` : '',
    person.mother_id ? `母：${people.find((item) => item.id === person.mother_id)?.name ?? '未注明'}` : '',
    includeSpouse && person.spouse_id ? `配偶：${people.find((item) => item.id === person.spouse_id)?.name ?? '未注明'}` : '',
    siblings.length ? `兄弟姐妹：${siblings.map((item) => `${item.name}（${personSexLabel(item)}）`).join('、')}` : '',
  ].filter(Boolean);
  return relations.length ? relations.join(' · ') : '关系未填写';
}

function lineagePersonMarkup(person: StudioPerson) {
  const codes = escapeHtml(`${personMarkerSymbols(person)}${personResidenceCode(person)}`);
  return `<span class="lineage-person-line"><i class="lineage-person-codes">${codes}</i><b>${escapeHtml(personDisplayName(person))}</b><em class="lineage-sex lineage-sex-${escapeAttribute(person.sex)}">${personSexLabel(person)}</em></span>`;
}

function renderLineage(people: StudioPerson[]) {
  const target = document.querySelector<HTMLElement>('[data-lineage-canvas]');
  if (!target) return;
  target.setAttribute('aria-busy', 'false');
  if (!people.length) {
    target.innerHTML = '<p class="studio-empty">加入族人后，这里会显示关系图。</p>';
    return;
  }
  const generationRecords = buildLineageGenerations(people);
  const grid = buildLineageGrid(generationRecords);
  target.innerHTML = `<div class="lineage-tree" style="--lineage-columns:${grid.columns}" aria-label="按代次、家庭支系和父母子女关系排列的世系关系图">
    <div class="lineage-tree-head"><div><strong>拓氏相册家谱</strong><span>按第一代落地新加坡为起点，逐代记录家庭支系</span></div><p><b>横线</b>表示配偶或同一家庭，<b>竖线</b>表示父母与子女。</p></div>
    <div class="lineage-tree-grid">${generationRecords.map((record, generationIndex) => {
    const branchCards = record.branches.map((branch, branchIndex) => {
      const { members, parents } = branch;
      const parentLine = parents.length ? `<div class="lineage-branch-parents"><span>上承</span>${parents.map((parent) => escapeHtml(parent.name)).join('、')}</div>` : '';
      const childLine = `<div class="lineage-branch-children"><span>子女</span><div class="lineage-child-list"><span class="lineage-child-node">${escapeHtml(branchChildSummary(branch))}</span></div></div>`;
      const familyMembers = orderedFamilyMembers(members).map(lineagePersonMarkup).join('');
      const familyType = members.length > 1 ? '夫妻家庭' : '个人支系';
      const parentsForConnection = parentBranchIds(generationRecords, generationIndex, branch).join(',');
      const placement = grid.placements.get(branch.id);
      const gridStyle = placement ? ` style="grid-column:${placement.start} / span ${placement.span}"` : '';
      return `<article class="lineage-branch"${gridStyle} data-branch-id="${escapeAttribute(branch.id)}" data-parent-branch-ids="${escapeAttribute(parentsForConnection)}"><div class="lineage-branch-label">家庭支系 ${branchIndex + 1}</div>${parentLine}<div class="lineage-family-pair"><div class="lineage-couple"><span>${familyType}</span><div class="lineage-person-list">${familyMembers}</div></div></div>${childLine}</article>`;
    }).join('');
    return `<section class="lineage-generation-row" data-generation="${record.generation}"><div class="lineage-generation-axis"><span>第 ${record.generation} 代</span><small>${record.members.length} 位族人<br>${record.branches.length} 个家庭支系</small></div><div class="lineage-generation-branches">${branchCards}</div></section>`;
  }).join('')}</div>
    ${lineageLegendMarkup()}<div class="lineage-tree-note">资料图以目前已填写的族人为准；“未填写”只表示尚未登记子女资料。“止”表示确认无子嗣，“夭”表示夭折未续支。</div>
  </div>`;
  drawLineageConnections(target.querySelector<HTMLElement>('.lineage-tree')!, { rowSelector: '.lineage-generation-row', branchSelector: '.lineage-branch' });
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
  list.setAttribute('aria-busy', 'false');
  list.replaceChildren();
  if (!items.length) {
    list.innerHTML = '<p class="studio-empty">尚未上传图片。</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('figure');
    card.className = 'studio-media-item';
    card.dataset.mediaId = item.id;
    if (item.signed_url) {
      const image = document.createElement('img');
      image.src = item.signed_url;
      image.alt = item.caption || '会员私密图片';
      image.loading = 'lazy';
      card.append(image);
    } else {
      const unavailable = document.createElement('p');
      unavailable.className = 'studio-media-unavailable';
      unavailable.textContent = '这张旧图片尚未生成展示版，请重新上传一次即可继续使用。';
      card.append(unavailable);
    }
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
    card.append(controls);
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
    if (mediaStatus) mediaStatus.textContent = '图片功能正在启用，文字资料仍可正常保存；旧图片若未生成展示版，会提示重新上传。';
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
    setSaveState(form, Boolean(book?.consent_at), book?.consent_at ? '已完成' : '保存封面');
    watchForEdits(form, '保存封面');
  }
  if (type === 'notes' && form) {
    renderStructuredFields(method, content);
    const notes = form.elements.namedItem('notes') as HTMLTextAreaElement | null;
    const imageNotes = form.elements.namedItem('imageNotes') as HTMLTextAreaElement | null;
    const complete = form.elements.namedItem('complete') as HTMLInputElement | null;
    if (notes) notes.value = String(content.notes ?? '');
    if (imageNotes) imageNotes.value = String(content.imageNotes ?? '');
    if (complete) complete.checked = Boolean(section?.is_complete);
    setSaveState(form, Boolean(section?.is_complete), section?.is_complete ? '已完成' : '保存这一章');
    watchForEdits(form, '保存这一章');
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
      setSaveState(form, true, '已完成');
    } else {
      const content = structuredContent(form);
      const complete = Boolean(data.get('complete'));
      await saveSection(bookId, method, content, complete);
      setSaveState(form, complete, complete ? '已完成' : '保存这一章');
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
    const birthDate = stringOrNull(data.get('birthDate'));
    const deathDate = stringOrNull(data.get('deathDate'));
    const lifeStatusValue = String(data.get('lifeStatus') || 'unspecified');
    if (birthDate && deathDate && deathDate < birthDate) throw new Error('去世日期不能早于出生日期。');
    if (deathDate && lifeStatusValue !== 'deceased') throw new Error('填写去世日期时，状态必须选择“已故”。');
    await addPerson(bookId, { name, generation_number: generation, sex: String(data.get('sex') || 'unspecified'), life_status: lifeStatusValue, father_id: null, mother_id: null, spouse_id: null, birth_year: birthDate ? Number(birthDate.slice(0, 4)) : null, birth_date: birthDate, death_date: lifeStatusValue === 'deceased' ? deathDate : null, residence_code: lifeStatusValue === 'deceased' ? null : stringOrNull(data.get('residenceCode')), genealogy_markers: [], occupation: null, education: null, phone: null, address: null, note: stringOrNull(data.get('note')) });
    await saveSection(bookId, method, {}, true);
    form.reset();
    renderPeople(await listPeople(bookId, { includeSensitive: true }));
    report('已加入世系。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存人物。');
  }
});

document.querySelector<HTMLElement>('[data-person-list]')?.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.personEdit) return;
  event.preventDefault();
  try {
    const values = new FormData(form);
    const person = peopleItems.find((item) => item.id === form.dataset.personEdit);
    if (!person) throw new Error('找不到这位族人，请刷新后重试。');
    const name = stringOrNull(values.get('name'));
    const generation = Number(values.get('generation'));
    if (!name || !Number.isInteger(generation) || generation < 1) throw new Error('请填写姓名与正确的世代。');
    const previousSpouseId = person.spouse_id;
    const spouseId = stringOrNull(values.get('spouseId'));
    const lifeStatusValue = String(values.get('lifeStatus') || 'unspecified');
    const birthDate = stringOrNull(values.get('birthDate'));
    const deathDate = stringOrNull(values.get('deathDate'));
    const fatherId = stringOrNull(values.get('fatherId'));
    const motherId = stringOrNull(values.get('motherId'));
    const markers = values.getAll('markers').map(String);
    if (birthDate && deathDate && deathDate < birthDate) throw new Error('去世日期不能早于出生日期。');
    if (deathDate && lifeStatusValue !== 'deceased') throw new Error('填写去世日期时，状态必须选择“已故”。');
    if (markers.includes('died_young') && lifeStatusValue !== 'deceased') throw new Error('选择“夭”时，状态必须选择“已故”。');
    if (markers.includes('no_descendants') && peopleItems.some((candidate) => candidate.father_id === person.id || candidate.mother_id === person.id)) throw new Error('这位族人已有子女关系，不能同时标记“止／无子嗣”。');
    await updatePerson(person.id, {
      name,
      generation_number: generation,
      sex: String(values.get('sex') || 'unspecified'),
      life_status: lifeStatusValue,
      father_id: fatherId,
      mother_id: motherId,
      spouse_id: spouseId,
      birth_year: birthDate ? Number(birthDate.slice(0, 4)) : person.birth_year,
      birth_date: birthDate,
      death_date: lifeStatusValue === 'deceased' ? deathDate : null,
      residence_code: lifeStatusValue === 'deceased' ? null : stringOrNull(values.get('residenceCode')),
      genealogy_markers: markers,
      note: stringOrNull(values.get('note')),
    });
    if (previousSpouseId && previousSpouseId !== spouseId) await updatePerson(previousSpouseId, { spouse_id: null });
    if (spouseId && spouseId !== previousSpouseId) await updatePerson(spouseId, { spouse_id: person.id });
    renderPeople(await listPeople(bookId, { includeSensitive: true }));
    const savedForm = document.querySelector<HTMLFormElement>(`[data-person-edit="${person.id}"]`);
    const saveButton = savedForm?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (saveButton) {
      saveButton.textContent = '已完成';
      saveButton.classList.add('is-complete');
    }
    report('人物与关系已保存。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法保存人物与关系。');
  }
});

document.querySelector<HTMLElement>('[data-person-list]')?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.closest('[data-delete-person]')) return;
  const form = target.closest<HTMLFormElement>('[data-person-edit]');
  const id = form?.dataset.personEdit;
  if (!id || !window.confirm('确定删除这位族人吗？已有关系会自动断开，其他资料不会删除。')) return;
  try {
    await deletePerson(id);
    renderPeople(await listPeople(bookId, { includeSensitive: true }));
    report('人物已删除，相关关系已断开。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法删除人物。');
  }
});

document.querySelector<HTMLElement>('[data-register-list]')?.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.registerPerson) return;
  event.preventDefault();
  try {
    const values = new FormData(form);
    await updatePerson(form.dataset.registerPerson, { occupation: stringOrNull(values.get('occupation')), education: stringOrNull(values.get('education')), phone: stringOrNull(values.get('privatePhone')), address: stringOrNull(values.get('privateAddress')) });
    await saveSection(bookId, method, {}, true);
    const saveButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (saveButton) {
      saveButton.textContent = '已完成';
      saveButton.classList.add('is-complete');
    }
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
      if (mediaStatus) mediaStatus.textContent = `正在校正方向并压缩 ${file.name}…`;
      await uploadMedia(bookId, method, file);
    }
    input.value = '';
    await loadMedia();
    if (mediaStatus) mediaStatus.textContent = '图片已标准化保存：展示图已自动校正方向并压缩。';
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
    if (type === 'people') renderPeople(await listPeople(bookId, { includeSensitive: true }));
    if (type === 'register') {
      renderPeople(await listPeople(bookId, { includeSensitive: true }), true);
      if ((await getSection(bookId, method))?.is_complete) {
        document.querySelectorAll<HTMLButtonElement>('[data-register-list] button[type="submit"]').forEach((button) => {
          button.textContent = '已完成';
          button.classList.add('is-complete');
        });
      }
    }
    await loadMedia();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
