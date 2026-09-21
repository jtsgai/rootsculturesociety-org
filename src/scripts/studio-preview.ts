import { allSections, currentBook, currentMember, listMedia, listPeople, memberPdfDownloadEnabled, signOut, studioUnavailableMessage, type StudioPerson } from '../lib/studio';
import { branchChildSummary, buildLineageGenerations, buildLineageGrid, familyBranchLabel, genealogyMarkerLabels, lineageLegendMarkup, orderedFamilyMembers, parentBranchIds, personLifespan, personMarkerSymbols, personResidenceCode, personSexLabel, siblingsOf } from '../lib/lineage';
import { drawLineageConnections } from '../lib/lineage-connections';
import { getStudioMediaProfile, studioSteps } from '../data/studio';

const target = document.querySelector<HTMLElement>('[data-preview-book]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const readiness = document.querySelector<HTMLElement>('[data-preview-readiness]');
const printButton = document.querySelector<HTMLButtonElement>('[data-preview-print]');
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
  row.className = `preview-definition${key === 'story' ? ' preview-definition-story' : ''}`;
  const term = document.createElement('dt');
  term.textContent = labelFor(key);
  const detail = document.createElement('dd');
  detail.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
  row.append(term, detail);
  parent.append(row);
}

function relationText(person: StudioPerson, people: StudioPerson[], includeSpouse = true) {
  const siblings = siblingsOf(person, people);
  const relations = [
    person.father_id ? `父：${people.find((item) => item.id === person.father_id)?.name ?? '未注明'}` : '',
    person.mother_id ? `母：${people.find((item) => item.id === person.mother_id)?.name ?? '未注明'}` : '',
    includeSpouse && person.spouse_id ? `配偶：${people.find((item) => item.id === person.spouse_id)?.name ?? '未注明'}` : '',
    siblings.length ? `兄弟姐妹：${siblings.map((item) => `${item.name}（${personSexLabel(item)}）`).join('、')}` : '',
  ].filter(Boolean);
  return relations.length ? relations.join('\n') : '关系未填写';
}

function personMeta(person: StudioPerson) {
  const life = person.life_status === 'living' ? '在世' : person.life_status === 'deceased' ? '已故' : '状态未注明';
  const lifespan = personLifespan(person);
  const residence = personResidenceCode(person);
  const markers = (person.genealogy_markers ?? []).map((marker) => genealogyMarkerLabels[marker]?.label).filter(Boolean).join('、');
  return [`第 ${person.generation_number} 代`, life, lifespan, residence ? `现居 ${residence}` : '', markers].filter(Boolean).join(' · ');
}

function lineagePersonElement(person: StudioPerson) {
  const row = document.createElement('span');
  row.className = 'lineage-person-line';
  const codes = document.createElement('i');
  codes.className = 'lineage-person-codes';
  codes.textContent = `${personMarkerSymbols(person)}${personResidenceCode(person)}`;
  const name = document.createElement('b');
  const personName = document.createElement('span');
  personName.className = 'lineage-person-name';
  personName.textContent = person.name;
  const lifespan = document.createElement('span');
  lifespan.className = 'lineage-person-lifespan';
  lifespan.textContent = `（${personLifespan(person)}）`;
  name.append(personName, lifespan);
  const sex = document.createElement('em');
  sex.className = `lineage-sex lineage-sex-${person.sex ?? 'unspecified'}`;
  sex.textContent = personSexLabel(person);
  row.append(codes, name, sex);
  return row;
}

function lineageResidenceLabel(members: StudioPerson[]) {
  const address = members.map((person) => person.address?.trim()).find(Boolean);
  if (!address) return '';
  const place = address.replace(/家庭住址$/, '').trim();
  if (!place) return '';
  const deceased = members.every((person) => person.life_status === 'deceased');
  return `${deceased ? '曾居' : '居住地'}：${place}`;
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
  const grid = buildLineageGrid(generations);
  tree.style.setProperty('--lineage-columns', String(grid.columns));
  generations.forEach((record, generationIndex) => {
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
      card.dataset.branchId = branch.id;
      card.dataset.parentBranchIds = parentBranchIds(generations, generationIndex, branch).join(',');
      const placement = grid.placements.get(branch.id);
      if (placement) card.style.gridColumn = `${placement.start} / span ${placement.span}`;
      const branchLabel = document.createElement('span');
      branchLabel.className = 'preview-lineage-branch-label';
      branchLabel.textContent = `家庭支系 ${index + 1}`;
      const family = document.createElement('div');
      family.className = 'lineage-person-list';
      orderedFamilyMembers(branch.members).forEach((person) => family.append(lineagePersonElement(person)));
      const type = document.createElement('small');
      type.textContent = branch.members.length > 1 ? '夫妻家庭' : '个人支系';
      const residence = lineageResidenceLabel(branch.members);
      const residenceNote = document.createElement('small');
      residenceNote.className = 'preview-lineage-residence';
      residenceNote.textContent = residence;
      card.append(branchLabel, family, type);
      if (residence) card.append(residenceNote);
      if (branch.parents.length) {
        const parentLine = document.createElement('p');
        parentLine.className = 'preview-lineage-parent';
        parentLine.textContent = `上承：${branch.parents.map((person) => person.name).join('、')}`;
        card.append(parentLine);
      }
      const childLine = document.createElement('p');
      childLine.className = 'preview-lineage-child';
      childLine.textContent = `子女：${branchChildSummary(branch)}`;
      card.append(childLine);
      nodes.append(card);
    });
    level.append(label, nodes);
    tree.append(level);
  });
  parent.append(tree);
  drawLineageConnections(tree, { rowSelector: '.preview-lineage-generation', branchSelector: '.preview-lineage-family' });
  const legend = document.createElement('div');
  legend.innerHTML = lineageLegendMarkup();
  parent.append(...legend.children);
  const note = document.createElement('p');
  note.className = 'preview-lineage-note';
  note.textContent = '关系只依据会员填写的父亲、母亲与配偶字段；未注明的关系不会由系统推测。';
  parent.append(note);
}

function renderRegister(parent: HTMLElement, people: StudioPerson[], thumbnailSize: string) {
  if (!people.length) {
    parent.textContent = '尚未加入族人。';
    return;
  }
  const heading = document.createElement('h4');
  heading.className = 'preview-subheading';
  heading.textContent = '族人资料表';
  parent.append(heading);
  const table = document.createElement('table');
  const allowedSizes = ['small', 'medium', 'large'];
  const size = allowedSizes.includes(thumbnailSize) ? thumbnailSize : 'medium';
  table.className = `preview-register-table register-thumb-${size}`;
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['照片', '世代与姓名', '关系与生卒', '教育与职业', '联络资料', '人物小记'].forEach((label) => {
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
    familyCell.colSpan = 6;
    familyCell.scope = 'rowgroup';
    familyCell.textContent = `第 ${generation.generation} 代 · 家庭支系 ${branchIndex + 1}：${familyBranchLabel(branch)}`;
    familyRow.append(familyCell);
    body.append(familyRow);
    orderedFamilyMembers(branch.members).forEach((person) => {
      const row = document.createElement('tr');
      const photoCell = document.createElement('td');
      photoCell.className = 'preview-register-photo';
      if (person.photo_signed_url) {
        const image = document.createElement('img');
        image.src = person.photo_signed_url;
        image.alt = `${person.name}的族人照片`;
        image.loading = 'lazy';
        photoCell.append(image);
      } else {
        photoCell.textContent = '未上传';
      }
      row.append(photoCell);
      const cells = [
        `第 ${person.generation_number} 代\n${person.name}`,
        `${relationText(person, people)}\n${personSexLabel(person)} · ${personMeta(person)}`,
        [person.education, person.occupation].filter(Boolean).join('\n') || '未填写',
        [person.phone, person.address].filter(Boolean).join('\n') || '私密资料未填写',
        person.note || '未填写',
      ];
      cells.forEach((text, index) => {
        const cell = document.createElement('td');
        if (index === 0) cell.className = 'preview-register-name';
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
    const setOrientation = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const orientation = image.naturalWidth >= image.naturalHeight ? 'landscape' : 'portrait';
      visual.classList.remove('is-landscape', 'is-portrait');
      visual.classList.add(`is-${orientation}`);
      figure.classList.remove('is-landscape', 'is-portrait');
      figure.classList.add(`is-${orientation}`);
    };
    image.addEventListener('load', setOrientation, { once: true });
    const caption = document.createElement('figcaption');
    const number = document.createElement('span');
    number.textContent = `图 ${String(index + 1).padStart(2, '0')}`;
    const description = document.createElement('p');
    description.textContent = captionText;
    const context = document.createElement('small');
    context.textContent = '一张照片，一段可以被后人读懂的家族记忆。';
    visual.append(image);
    setOrientation();
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
  const setOrientation = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    visual.classList.add(image.naturalWidth >= image.naturalHeight ? 'is-landscape' : 'is-portrait');
  };
  image.addEventListener('load', setOrientation, { once: true });
  visual.append(image);
  setOrientation();
  return visual;
}

async function renderPreview(bookId: string) {
  if (!target) return;
  const [book, sections, people] = await Promise.all([currentBook(), allSections(bookId), listPeople(bookId, { includeSensitive: true })]);
  if (!book) throw new Error('找不到你的相册家谱。');
  const sectionMap = new Map(sections.map((section) => [section.method, section]));
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
    const dedication = sectionMap.get(1)?.content?.dedication;
    const description = typeof dedication === 'string' ? dedication.trim() : '';
    if (description) {
      const coverDescription = document.createElement('p');
      coverDescription.className = 'preview-cover-description';
      coverDescription.textContent = description;
      coverCopy.append(coverDescription);
    }
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
    else if (step.method === 8) {
      const registerContent = sectionMap.get(8)?.content ?? {};
      renderRegister(body, people, typeof registerContent.thumbnailSize === 'string' ? registerContent.thumbnailSize : 'medium');
    }
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
  if (!chapterMode) {
    const coverContent = sectionMap.get(1)?.content ?? {};
    const backCover = document.createElement('footer');
    backCover.className = 'preview-back-cover page-break-before';
    const mark = document.createElement('div');
    mark.className = 'preview-back-cover-mark';
    const logo = document.createElement('img');
    logo.src = '/brand/RCSSLogo.png';
    logo.alt = '';
    logo.setAttribute('aria-hidden', 'true');
    const society = document.createElement('span');
    society.textContent = '新加坡根缘文化学会';
    const societyEnglish = document.createElement('small');
    societyEnglish.textContent = 'Roots Culture Society of Singapore';
    mark.append(logo, society, societyEnglish);
    const backCopy = document.createElement('div');
    backCopy.className = 'preview-back-cover-copy';
    const backKicker = document.createElement('span');
    backKicker.className = 'eyebrow';
    backKicker.textContent = 'A BOOK TO BE CARRIED FORWARD';
    const backHeading = document.createElement('h3');
    backHeading.textContent = '把名字留下，\n把记忆交给后来的人。';
    const backNote = document.createElement('p');
    const savedBackNote = typeof coverContent.backCoverNote === 'string' ? coverContent.backCoverNote.trim() : '';
    backNote.textContent = savedBackNote || '一张照片，一段口述，一条从祖籍走到狮城的路。愿这本相册家谱，让家人重新看见彼此，也让后来的人知道自己从哪里来。';
    backCopy.append(backKicker, backHeading, backNote);
    const details = document.createElement('div');
    details.className = 'preview-back-cover-details';
    const detailTitle = document.createElement('strong');
    detailTitle.textContent = book.title || '相册家谱';
    const detailAncestor = document.createElement('span');
    detailAncestor.textContent = book.generation_one_ancestor ? `第一代开族始祖：${book.generation_one_ancestor}` : '';
    const detailPlace = document.createElement('span');
    detailPlace.textContent = typeof coverContent.ancestralPlace === 'string' && coverContent.ancestralPlace.trim() ? `祖籍：${coverContent.ancestralPlace.trim()}` : '';
    details.append(detailTitle, detailAncestor, detailPlace);
    backCover.append(mark, backCopy, details);
    target.append(backCover);
  }
}

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/studio/login');
});

printButton?.addEventListener('click', () => window.print());

void (async () => {
  try {
    setPreviewMode();
    const [member, book, canDownloadPdf] = await Promise.all([currentMember(), currentBook(), memberPdfDownloadEnabled()]);
    if (!member || !book) return window.location.assign('/studio/login');
    if (member.status !== 'active') return report('此会员账户目前未启用；请联系学会确认会籍状态。');
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
    if (printButton && !chapterMode && canDownloadPdf) printButton.hidden = false;
    await renderPreview(book.id);
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
