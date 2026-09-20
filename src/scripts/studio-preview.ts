import { allSections, currentBook, currentMember, listMedia, listPeople, signOut, studioUnavailableMessage, type StudioPerson } from '../lib/studio';
import { studioSteps } from '../data/studio';

const target = document.querySelector<HTMLElement>('[data-preview-book]');
const status = document.querySelector<HTMLElement>('[data-studio-status]');
const labels: Record<string, string> = {
  surname: '姓氏或家族线索', ancestralPlace: '祖籍地', story: '家中流传的故事', sources: '资料来源或待查线索',
  dialect: '方言群', hallName: '堂号', places: '祖屋、祖庙或会馆', notes: '补充说明',
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

function renderPeople(parent: HTMLElement, people: StudioPerson[]) {
  if (!people.length) {
    parent.textContent = '尚未加入族人。';
    return;
  }
  people.forEach((person) => {
    const card = document.createElement('article');
    card.className = 'preview-person-card';
    const name = document.createElement('h4');
    name.textContent = person.name;
    const meta = document.createElement('p');
    meta.textContent = `第 ${person.generation_number} 代 · ${person.life_status === 'living' ? '在世' : person.life_status === 'deceased' ? '已故' : '状态未注明'}${person.birth_year ? ` · ${person.birth_year}` : ''}`;
    card.append(name, meta);
    const details = document.createElement('dl');
    addDefinition(details, '父亲', people.find((item) => item.id === person.father_id)?.name);
    addDefinition(details, '母亲', people.find((item) => item.id === person.mother_id)?.name);
    addDefinition(details, '配偶', people.find((item) => item.id === person.spouse_id)?.name);
    addDefinition(details, '职业', person.occupation);
    addDefinition(details, '教育', person.education);
    addDefinition(details, '电话', person.phone);
    addDefinition(details, '地址', person.address);
    addDefinition(details, '人物小记', person.note);
    card.append(details);
    parent.append(card);
  });
}

async function renderPreview(bookId: string) {
  if (!target) return;
  const [book, sections, people] = await Promise.all([currentBook(), allSections(bookId), listPeople(bookId, { includeSensitive: true })]);
  if (!book) throw new Error('找不到你的相册家谱。');
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
  target.append(cover);

  const sectionMap = new Map(sections.map((section) => [section.method, section]));
  for (const step of studioSteps) {
    const section = sectionMap.get(step.method);
    if (step.method === 1 || (!section && step.method !== 5) || (step.method === 5 && !people.length)) continue;
    const article = document.createElement('article');
    article.className = 'preview-chapter page-break-before';
    const kicker = document.createElement('span');
    kicker.className = 'eyebrow';
    kicker.textContent = `${String(step.method).padStart(2, '0')} / ${step.english}`;
    const heading = document.createElement('h3');
    heading.textContent = step.title;
    article.append(kicker, heading);
    const body = document.createElement('div');
    body.className = 'preview-chapter-body';
    if (step.method === 5) renderPeople(body, people);
    else if (section) Object.entries(section.content).forEach(([key, value]) => addDefinition(body, key, value));
    article.append(body);
    try {
      const media = await listMedia(bookId, step.method);
      if (media.length) {
        const gallery = document.createElement('div');
        gallery.className = 'preview-media-grid';
        media.forEach((item) => {
          if (!item.signed_url) return;
          const figure = document.createElement('figure');
          const image = document.createElement('img');
          image.src = item.signed_url;
          image.alt = item.caption || '相册家谱图片';
          const caption = document.createElement('figcaption');
          caption.textContent = item.caption || '';
          figure.append(image, caption);
          gallery.append(figure);
        });
        article.append(gallery);
      }
    } catch {
      // A missing private media table or expired signed URL must not block text preview.
    }
    target.append(article);
  }
}

document.querySelector<HTMLButtonElement>('[data-print-preview]')?.addEventListener('click', () => window.print());
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
