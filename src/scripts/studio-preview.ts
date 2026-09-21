import { allSections, currentBook, currentMember, listMedia, listPeople, signOut, studioUnavailableMessage, type StudioPerson } from '../lib/studio';
import { buildLineageGenerations, familyBranchLabel, lifeStatusLabel } from '../lib/lineage';
import { getStudioMediaProfile, studioSteps } from '../data/studio';

const target = document.querySelector<HTMLElement>('[data-preview-book]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const readiness = document.querySelector<HTMLElement>('[data-preview-readiness]');
const requestedChapter = Number(new URLSearchParams(window.location.search).get('chapter'));
const selectedStep = studioSteps.find((step) => step.method === requestedChapter);
const chapterMode = Boolean(selectedStep);
const labels: Record<string, string> = {
  surname: '姓氏或家族线索', ancestralPlace: '祖籍地', story: '家中流传的故事', sources: '资料来源或待查线索',
  dialect: '方言群', hallName: '堂号', places: '祖屋、祖庙或会馆', notes: '补充说明',
  migrationRows: '迁徙记录', childhoodRows: '童年记忆', dishRows: '家肴记录',
  year: '年份', place: '地点', note: '记忆或说明', dish: '菜名', ingredients: '材料', method: '做法', taughtBy: '传授者',
};
const photoFallbacks: Record<number, string> = {
  2: '从旧相片、木箱与手稿开始，辨认家中代代相传的姓氏线索。',
  3: '家书、船票与店屋地址，让一段迁徙路程有了可以追溯的物证。',
  4: '茶桌、器物与日常习惯，是籍贯文化留在家里的细小痕迹。',
  5: '把三代人的资料放在同一张世系图里，看见名字之间的来处与去处。',
  6: '旧巷口、书包与雨后的路面，收住一个家庭共同记得的童年场景。',
  7: '一桌家常菜，把代代相传的手艺和一家人的相聚留在画面里。',
  8: '资料卡、照片与记录，让每位家人的人生线索可以继续补充。',
};

function report(message: string) {
  if (status) status.textContent = message;
}

function setPreviewMode() {
  const pageTitle = document.querySelector<HTMLElement>('[data-studio-page-title]');
  const kicker = document.querySelector<HTMLElement>('[data-preview-kicker]');
  const memberNote = document.querySelector<HTMLElement>('[data-preview-member-note]');
  const privacyNote = document.querySelector<HTMLElement>('[data-preview-privacy-note]');
  const returnLink = document.querySelector<HTMLAnchorElement>('[data-preview-return]');

  if (!selectedStep) {
    if (readiness) readiness.hidden = false;
    return;
  }

  document.title = `第 ${selectedStep.method} 章 · ${selectedStep.title}｜新加坡根缘文化学会`;
  if (pageTitle) pageTitle.textContent = `第 ${selectedStep.method} 章 · ${selectedStep.title}`;
  if (kicker) kicker.textContent = `${String(selectedStep.method).padStart(2, '0')} / 本章预览`;
  if (memberNote) memberNote.textContent = '只显示本章节的图片、文字与顺序';
  if (privacyNote) privacyNote.textContent = '本章预览只对当前会员登录有效；图片会按印刷比例呈现，方便检查图文是否贴合。';
  if (returnLink) {
    returnLink.href = '/studio/preview';
    returnLink.textContent = '← 返回相册家谱总览';
  }
  if (readiness) readiness.hidden = true;
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

function relationText(person: StudioPerson, people: StudioPerson[], includeSpouse = true) {
  const relations = [
    person.father_id ? `父：${people.find((item) => item.id === person.father_id)?.name ?? '未注明'}` : '',
    person.mother_id ? `母：${people.find((item) => item.id === person.mother_id)?.name ?? '未注明'}` : '',
    includeSpouse && person.spouse_id ? `配偶：${people.find((item) => item.id === person.spouse_id)?.name ?? '未注明'}` : '',
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
  tree.className = 'preview-lineage-tree preview-lineage-family-tree';
  const head = document.createElement('div');
  head.className = 'preview-lineage-head';
  head.textContent = '横线表示同一家庭；竖线对应父母与下一代。夫妻只在同一家庭支系中出现一次。';
  tree.append(head);
  const generations = buildLineageGenerations(people);
  generations.forEach((record) => {
    const level = document.createElement('section');
    level.className = 'preview-lineage-generation';
    const label = document.createElement('span');
    label.className = 'preview-generation-label';
    label.textContent = `第 ${record.generation} 代`;
    const count = document.createElement('small');
    count.textContent = `${record.members.length} 位族人 · ${record.branches.length} 个家庭支系`;
    label.append(count);
    const nodes = document.createElement('div');
    nodes.className = 'preview-lineage-branches';
    record.branches.forEach((branch, index) => {
      const card = document.createElement('article');
      card.className = 'preview-lineage-family';
      const branchLabel = document.createElement('span');
      branchLabel.className = 'preview-lineage-branch-label';
      branchLabel.textContent = `家庭支系 ${index + 1}`;
      const family = document.createElement('strong');
      family.textContent = branch.members.map((person) => `${person.name}（${lifeStatusLabel(person.life_status)}${person.birth_year ? `，出生 ${person.birth_year}` : ''}）`).join(' × ');
      const type = document.createElement('small');
      type.textContent = branch.members.length > 1 ? '夫妻家庭' : '个人支系';
      card.append(branchLabel, family, type);
      if (branch.parents.length) {
        const parentLine = document.createElement('p');
        parentLine.className = 'preview-lineage-parent';
        parentLine.textContent = `上承：${branch.parents.map((person) => person.name).join('、')}`;
        card.append(parentLine);
      }
      const childLine = document.createElement('p');
      childLine.className = 'preview-lineage-child';
      childLine.textContent = `子女：${branch.children.length ? branch.children.map((person) => person.name).join('、') : '待补充'}`;
      card.append(childLine);
      nodes.append(card);
    });
    level.append(label, nodes);
    tree.append(level);
  });
  parent.append(tree);
  const note = document.createElement('p');
  note.className = 'preview-lineage-note';
  note.textContent = '关系只依据会员填写的父亲、母亲与配偶字段；未注明的关系不会由系统推测。';
  parent.append(note);
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
  const table = document.createElement('table');
  table.className = 'preview-register-table';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['世代与姓名', '关系与生卒', '教育与职业', '联络资料', '人物小记'].forEach((label) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement('tbody');
  buildLineageGenerations(people).forEach((generation) => generation.branches.forEach((branch, branchIndex) => {
    const familyRow = document.createElement('tr');
    familyRow.className = 'preview-register-family-heading';
    const familyCell = document.createElement('th');
    familyCell.colSpan = 5;
    familyCell.scope = 'rowgroup';
    familyCell.textContent = `第 ${generation.generation} 代 · 家庭支系 ${branchIndex + 1}：${familyBranchLabel(branch)}`;
    familyRow.append(familyCell);
    body.append(familyRow);
    branch.members.forEach((person) => {
      const row = document.createElement('tr');
      const cells = [
        `第 ${person.generation_number} 代\n${person.name}`,
        `${relationText(person, people, false)}\n${person.sex === 'male' ? '男' : person.sex === 'female' ? '女' : '性别未注明'} · ${personMeta(person)}`,
        [person.education, person.occupation].filter(Boolean).join('\n') || '待补充',
        [person.phone, person.address].filter(Boolean).join('\n') || '私密资料未填写',
        person.note || '待补充',
      ];
      cells.forEach((text) => {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      });
      body.append(row);
    });
  }));
  table.append(head, body);
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

function createMediaSpreads(media: Awaited<ReturnType<typeof listMedia>>, method: number) {
  const visible = media.filter((item) => item.signed_url);
  if (!visible.length) return null;
  const spreads = document.createElement('div');
  spreads.className = `preview-photo-spreads media-frame-${getStudioMediaProfile(method).frame}`;
  visible.forEach((item, index) => {
    const figure = document.createElement('figure');
    figure.className = 'preview-photo-spread';
    if (index % 2) figure.classList.add('is-reversed');
    const visual = document.createElement('div');
    visual.className = 'preview-photo-visual';
    const image = document.createElement('img');
    image.src = item.signed_url!;
    const captionText = item.caption || photoFallbacks[method] || '请为这张照片补充一段记忆说明。';
    image.alt = captionText;
    image.loading = 'lazy';
    const caption = document.createElement('figcaption');
    const number = document.createElement('span');
    number.textContent = `图 ${String(index + 1).padStart(2, '0')}`;
    const description = document.createElement('p');
    description.textContent = captionText;
    const context = document.createElement('small');
    context.textContent = '一张照片，一段可以被后人读懂的家族记忆。';
    visual.append(image);
    caption.append(number, description, context);
    figure.append(visual, caption);
    spreads.append(figure);
  });
  return spreads;
}

function createCoverPhoto(media: Awaited<ReturnType<typeof listMedia>>) {
  const item = media.find((entry) => entry.signed_url);
  if (!item) return null;
  const visual = document.createElement('figure');
  visual.className = 'preview-cover-photo';
  const image = document.createElement('img');
  image.src = item.signed_url!;
  image.alt = item.caption || '相册家谱封面';
  image.loading = 'eager';
  visual.append(image);
  return visual;
}

async function renderPreview(bookId: string) {
  if (!target) return;
  const [book, sections, people] = await Promise.all([currentBook(), allSections(bookId), listPeople(bookId, { includeSensitive: true })]);
  if (!book) throw new Error('找不到你的相册家谱。');
  if (!chapterMode) renderReadiness(book, sections, people);
  target.replaceChildren();
  const appendCover = async () => {
    const cover = document.createElement('header');
    cover.className = 'preview-cover page-break-after';
    const coverKicker = document.createElement('span');
    coverKicker.className = 'eyebrow';
    coverKicker.textContent = 'PHOTO GENEALOGY / 相册家谱';
    const title = document.createElement('h2');
    title.textContent = book.title || '尚未命名的相册家谱';
    const ancestor = document.createElement('p');
    ancestor.textContent = book.generation_one_ancestor ? `第一代开族始祖：${book.generation_one_ancestor}` : '尚未填写第一代开族始祖。';
    const coverCopy = document.createElement('div');
    coverCopy.className = 'preview-cover-copy';
    coverCopy.append(coverKicker, title, ancestor);
    cover.append(coverCopy);
    try {
      const coverPhoto = createCoverPhoto(await listMedia(bookId, 1));
      if (coverPhoto) cover.append(coverPhoto);
    } catch {
      // A missing private media table or expired signed URL must not block text preview.
    }
    target.append(cover);
  };

  if (!chapterMode || selectedStep?.method === 1) await appendCover();

  const sectionMap = new Map(sections.map((section) => [section.method, section]));
  const stepsToRender = selectedStep?.method === 1 ? [] : selectedStep ? [selectedStep] : studioSteps;
  for (const step of stepsToRender) {
    const section = sectionMap.get(step.method);
    if (!chapterMode && (step.method === 1 || (!section && step.method !== 5) || (step.method === 5 && !people.length))) continue;
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
      const spreads = createMediaSpreads(media, step.method);
      if (spreads) article.append(spreads);
    } catch {
      // A missing private media table or expired signed URL must not block text preview.
    }
    const body = document.createElement('div');
    body.className = 'preview-chapter-body';
    if (step.method === 5) renderLineage(body, people);
    else if (step.method === 8) renderRegister(body, people);
    else if (section) Object.entries(section.content).forEach(([key, value]) => addDefinition(body, key, value));
    if (!body.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'studio-empty';
      empty.textContent = '本章尚未填写内容。返回本章继续补充后，再查看预览。';
      body.append(empty);
    }
    article.append(body);
    target.append(article);
  }
  if (!chapterMode && window.location.hash) {
    document.querySelector(window.location.hash)?.scrollIntoView({ block: 'start' });
  }
}

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/studio/login');
});

void (async () => {
  try {
    setPreviewMode();
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
