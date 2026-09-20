import { allSections, currentBook, currentMember, listMedia, listPeople, signOut, studioUnavailableMessage, type StudioPerson } from '../lib/studio';
import { getStudioMediaProfile, studioSteps } from '../data/studio';

const target = document.querySelector<HTMLElement>('[data-preview-book]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const readiness = document.querySelector<HTMLElement>('[data-preview-readiness]');
const labels: Record<string, string> = {
  surname: '姓氏或家族线索', ancestralPlace: '祖籍地', story: '家中流传的故事', sources: '资料来源或待查线索',
  dialect: '方言群', hallName: '堂号', places: '祖屋、祖庙或会馆', notes: '补充说明',
  migrationRows: '迁徙记录', childhoodRows: '童年记忆', dishRows: '家肴记录',
  year: '年份', place: '地点', note: '记忆或说明', dish: '菜名', ingredients: '材料', method: '做法', taughtBy: '传授者',
};

function report(message: string) {
  if (status) status.textContent = message;
}

function labelFor(key: string) {
  return labels[key] ?? key;
}

function addDefinition(parent: HTMLElement, key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return;
  if (Array.isArray(value)) {
    const group = document.createElement('div');
    group.className = 'preview-repeat-group';
    const heading = document.createElement('h4');
    heading.textContent = labelFor(key);
    group.append(heading);
    value.forEach((row) => {
      const item = document.createElement('div');
      item.className = 'preview-repeat-item';
      if (row && typeof row === 'object') Object.entries(row).forEach(([rowKey, rowValue]) => addDefinition(item, rowKey, rowValue));
      else item.textContent = String(row);
      group.append(item);
    });
    parent.append(group);
    return;
  }
  const row = document.createElement('div');
  row.className = 'preview-definition';
  const term = document.createElement('dt');
  term.textContent = labelFor(key);
  const detail = document.createElement('dd');
  detail.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
  row.append(term, detail);
  parent.append(row);
}

function relationText(person: StudioPerson, people: StudioPerson[]) {
  const relations = [
    person.father_id ? `父：${people.find((item) => item.id === person.father_id)?.name ?? '未注明'}` : '',
    person.mother_id ? `母：${people.find((item) => item.id === person.mother_id)?.name ?? '未注明'}` : '',
    person.spouse_id ? `配偶：${people.find((item) => item.id === person.spouse_id)?.name ?? '未注明'}` : '',
  ].filter(Boolean);
  return relations.length ? relations.join(' · ') : '关系待补充';
}

function personMeta(person: StudioPerson) {
  const life = person.life_status === 'living' ? '在世' : person.life_status === 'deceased' ? '已故' : '状态未注明';
  return `第 ${person.generation_number} 代 · ${life}${person.birth_year ? ` · 出生 ${person.birth_year}` : ''}`;
}

function renderLineage(parent: HTMLElement, people: StudioPerson[]) {
  if (!people.length) {
    parent.textContent = '尚未加入族人。';
    return;
  }
  const heading = document.createElement('h4');
  heading.className = 'preview-subheading';
  heading.textContent = '世系关系图';
  parent.append(heading);
  const tree = document.createElement('div');
  tree.className = 'preview-lineage-tree';
  const generations = [...new Set(people.map((person) => person.generation_number))].sort((a, b) => a - b);
  generations.forEach((generation) => {
    const column = document.createElement('section');
    column.className = 'preview-lineage-generation';
    const label = document.createElement('span');
    label.className = 'preview-generation-label';
    label.textContent = `第 ${generation} 代`;
    column.append(label);
    people.filter((person) => person.generation_number === generation).forEach((person) => {
      const card = document.createElement('article');
      card.className = 'preview-lineage-person';
      const name = document.createElement('strong');
      name.textContent = person.name;
      const meta = document.createElement('small');
      meta.textContent = personMeta(person);
      const relation = document.createElement('span');
      relation.textContent = relationText(person, people);
      card.append(name, meta, relation);
      column.append(card);
    });
    tree.append(column);
  });
  parent.append(tree);
  const note = document.createElement('p');
  note.className = 'preview-lineage-note';
  note.textContent = '关系按会员填写的父亲、母亲与配偶字段连接；未注明的关系不会由系统推测。';
  parent.append(note);
}

function registerField(parent: HTMLElement, label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return;
  const row = document.createElement('div');
  row.className = 'preview-register-field';
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = String(value);
  row.append(term, detail);
  parent.append(row);
}

function renderRegister(parent: HTMLElement, people: StudioPerson[]) {
  if (!people.length) {
    parent.textContent = '尚未加入族人。';
    return;
  }
  const heading = document.createElement('h4');
  heading.className = 'preview-subheading';
  heading.textContent = '族人资料表';
  parent.append(heading);
  const table = document.createElement('div');
  table.className = 'preview-register-list';
  [...people].sort((a, b) => a.generation_number - b.generation_number || a.name.localeCompare(b.name)).forEach((person) => {
    const card = document.createElement('article');
    card.className = 'preview-register-card';
    const heading = document.createElement('h4');
    heading.textContent = person.name;
    const meta = document.createElement('p');
    meta.textContent = personMeta(person);
    const fields = document.createElement('dl');
    registerField(fields, '关系', relationText(person, people));
    registerField(fields, '性别', person.sex === 'male' ? '男' : person.sex === 'female' ? '女' : '未注明');
    registerField(fields, '教育', person.education);
    registerField(fields, '职业', person.occupation);
    registerField(fields, '电话', person.phone);
    registerField(fields, '地址', person.address);
    registerField(fields, '人物小记', person.note);
    card.append(heading, meta, fields);
    table.append(card);
  });
  parent.append(table);
}

function completeMethods(book: Awaited<ReturnType<typeof currentBook>>, sections: Awaited<ReturnType<typeof allSections>>, people: StudioPerson[]) {
  const sectionMap = new Map(sections.map((section) => [section.method, section]));
  return studioSteps.filter((step) => {
    if (step.method === 1) return Boolean(book?.title && book.generation_one_ancestor && book.consent_at && sectionMap.get(1)?.is_complete);
    if (step.method === 5) return people.length > 0;
    if (step.method === 8) return people.length > 0 && Boolean(sectionMap.get(8)?.is_complete);
    return Boolean(sectionMap.get(step.method)?.is_complete);
  });
}

function renderReadiness(book: Awaited<ReturnType<typeof currentBook>>, sections: Awaited<ReturnType<typeof allSections>>, people: StudioPerson[]) {
  if (!readiness) return;
  const complete = completeMethods(book, sections, people);
  const missing = studioSteps.filter((step) => !complete.some((item) => item.method === step.method));
  readiness.replaceChildren();
  readiness.classList.toggle('is-ready', missing.length === 0);
  const heading = document.createElement('strong');
  heading.textContent = missing.length ? '这是当前草稿' : '八个章节已准备好预览';
  const detail = document.createElement('p');
  detail.textContent = missing.length
    ? `已标记完成 ${complete.length} / 8 章。还缺：${missing.map((step) => step.title).join('、')}。你仍可继续检查当前草稿，补完后再整理最终版本。`
    : '八个章节都已标记完成。仍建议逐页检查文字、图片与隐私内容。';
  readiness.append(heading, detail);
}

function createMediaGallery(media: Awaited<ReturnType<typeof listMedia>>, method: number) {
  const visible = media.filter((item) => item.signed_url);
  if (!visible.length) return null;
  const gallery = document.createElement('div');
  gallery.className = `preview-media-grid media-frame-${getStudioMediaProfile(method).frame}`;
  visible.forEach((item) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = item.signed_url!;
    image.alt = item.caption || '相册家谱图片';
    image.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = item.caption || '';
    figure.append(image, caption);
    gallery.append(figure);
  });
  return gallery;
}

async function renderPreview(bookId: string) {
  if (!target) return;
  const [book, sections, people] = await Promise.all([currentBook(), allSections(bookId), listPeople(bookId, { includeSensitive: true })]);
  if (!book) throw new Error('找不到你的相册家谱。');
  renderReadiness(book, sections, people);
  target.replaceChildren();
  const cover = document.createElement('header');
  cover.className = 'preview-cover page-break-after';
  const coverKicker = document.createElement('span');
  coverKicker.className = 'eyebrow';
  coverKicker.textContent = 'PHOTO GENEALOGY / 相册家谱';
  const title = document.createElement('h2');
  title.textContent = book.title || '尚未命名的相册家谱';
  const ancestor = document.createElement('p');
  ancestor.textContent = book.generation_one_ancestor ? `第一代开族始祖：${book.generation_one_ancestor}` : '尚未填写第一代开族始祖。';
  cover.append(coverKicker, title, ancestor);
  try {
    const coverGallery = createMediaGallery(await listMedia(bookId, 1), 1);
    if (coverGallery) cover.append(coverGallery);
  } catch {
    // A missing private media table or expired signed URL must not block text preview.
  }
  target.append(cover);

  const sectionMap = new Map(sections.map((section) => [section.method, section]));
  for (const step of studioSteps) {
    const section = sectionMap.get(step.method);
    if (step.method === 1 || (!section && step.method !== 5) || (step.method === 5 && !people.length)) continue;
    const article = document.createElement('article');
    article.className = 'preview-chapter page-break-before';
    article.id = `chapter-${step.method}`;
    const kicker = document.createElement('span');
    kicker.className = 'eyebrow';
    kicker.textContent = `${String(step.method).padStart(2, '0')} / ${step.english}`;
    const heading = document.createElement('h3');
    heading.textContent = step.title;
    article.append(kicker, heading);
    try {
      const media = await listMedia(bookId, step.method);
      const gallery = createMediaGallery(media, step.method);
      if (gallery) article.append(gallery);
    } catch {
      // A missing private media table or expired signed URL must not block text preview.
    }
    const body = document.createElement('div');
    body.className = 'preview-chapter-body';
    if (step.method === 5) renderLineage(body, people);
    else if (step.method === 8) renderRegister(body, people);
    else if (section) Object.entries(section.content).forEach(([key, value]) => addDefinition(body, key, value));
    article.append(body);
    target.append(article);
  }
  if (window.location.hash) {
    document.querySelector(window.location.hash)?.scrollIntoView({ block: 'start' });
  }
}

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/studio/login');
});

void (async () => {
  try {
    const [member, book] = await Promise.all([currentMember(), currentBook()]);
    if (!member || !book) return window.location.assign('/studio/login');
    if (member.status !== 'active') return report('此会员账户目前未启用；请联系学会确认会籍状态。');
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
    await renderPreview(book.id);
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
