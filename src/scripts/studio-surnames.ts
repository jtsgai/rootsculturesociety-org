import { buildSurnameImport, normalizeSurnames, searchSurnames, type SurnameContent } from '../lib/surnames';
import { getSection, saveSection } from '../lib/studio';

// An optional glob keeps the studio buildable before the dataset is delivered.
const modules = import.meta.glob('../data/surnames.json', { eager: true, import: 'default' });
const surnames = normalizeSurnames(Object.values(modules)[0]);

export function initializeSurnamePicker(
  bookId: string,
  escapeHtml: (value: string) => string,
  escapeAttribute: (value: string) => string
) {
  const picker = document.querySelector<HTMLElement>('[data-surname-picker]');
  const form = document.querySelector<HTMLFormElement>('[data-section-form]');
  if (!picker || !form) return;
  const grid = picker.querySelector<HTMLElement>('[data-surname-grid]')!;
  const preview = picker.querySelector<HTMLElement>('[data-surname-preview]')!;
  const actions = picker.querySelector<HTMLElement>('[data-surname-actions]')!;
  const count = picker.querySelector<HTMLElement>('[data-surname-count]')!;
  const status = picker.querySelector<HTMLElement>('[data-surname-status]')!;
  const search = picker.querySelector<HTMLInputElement>('[data-surname-search]')!;
  const button = picker.querySelector<HTMLButtonElement>('[data-surname-import]')!;
  let selected = -1;
  const render = () => {
    const matches = searchSurnames(surnames, search.value);
    count.textContent = !surnames.length
      ? '百家姓资料整理中，你仍可在下方填写并保存家族资料。'
      : matches.length
        ? `找到 ${matches.length} 个姓氏`
        : '暂未找到这个姓氏，请换个拼法，或直接在下方填写。';
    search.disabled = !surnames.length;
    grid.innerHTML = matches
      .map((surname) => {
        const index = surnames.indexOf(surname);
        return `<button type="button" class="studio-surname-chip" data-surname-index="${index}" aria-label="${escapeAttribute(`选择${surname.name}姓`)}" aria-pressed="${index === selected}">${escapeHtml(surname.name)}</button>`;
      })
      .join('');
  };
  search.addEventListener('input', render);
  grid.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-surname-index]') : null;
    if (!target) return;
    selected = Number(target.dataset.surnameIndex);
    const surname = surnames[selected];
    const fields: [string, string][] = [
      ['繁体', surname.traditional],
      ['拼音', surname.pinyin],
      ['常见拼法', surname.romanizations.join('、')],
      ['郡望', surname.junwang.join('、')],
      ['堂号', surname.tanghao.join('、')],
      ['起源', surname.origin],
      ['迁徙', surname.migration],
      [
        '字辈',
        surname.generationPoems.map((entry) => `${entry.branch ? `${entry.branch}：` : ''}${entry.poem}`).join('\n'),
      ],
      ['方言群', surname.dialectGroups.join('、')],
      ['宗亲会馆', surname.clanAssociations.join('、')],
      ['资料来源', surname.sources.map((source) => `${source.title}${source.url ? `：${source.url}` : ''}`).join('\n')],
    ];
    preview.innerHTML = `<h3>${escapeHtml(surname.name)}姓资料</h3><dl>${fields
      .filter(([, value]) => value)
      .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
      .join('')}</dl>`;
    preview.hidden = false;
    actions.hidden = false;
    status.textContent = '';
    grid
      .querySelectorAll<HTMLElement>('[data-surname-index]')
      .forEach((chip) => chip.setAttribute('aria-pressed', String(Number(chip.dataset.surnameIndex) === selected)));
  });
  button.addEventListener('click', async () => {
    const surname = surnames[selected];
    if (!surname || button.disabled) return;
    button.disabled = true;
    search.disabled = true;
    grid.inert = true;
    const saved: number[] = [];
    try {
      const content: Record<string, unknown> = {};
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]').forEach((field) => {
        content[field.name] = field.value;
      });
      const patch = buildSurnameImport(surname, { 2: content })[2];
      Object.entries(patch).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value;
      });
      form.dispatchEvent(new Event('input', { bubbles: true }));
      status.textContent = '本章资料已引入表单，请检查后保存。';
      for (const step of [3, 4] as const) {
        if (!picker.querySelector<HTMLInputElement>(`[data-surname-step="${step}"]`)?.checked) continue;
        const section = await getSection(bookId, step);
        const existing: SurnameContent = { [step]: section?.content ?? {} };
        const patch = buildSurnameImport(surname, existing)[step];
        if (Object.keys(patch).length)
          await saveSection(bookId, step, { ...existing[step], ...patch }, section?.is_complete ?? false);
        saved.push(step);
      }
      status.textContent = `本章资料已引入表单，请检查后点击“保存这一章”。${saved.length ? `第 ${saved.join('、')} 章资料已保存。` : ''}`;
    } catch {
      status.textContent = `本章资料已引入表单，请检查后保存。${saved.length ? `第 ${saved.join('、')} 章已保存。` : ''}其他章节导入未完成，请稍后重试；重复引入不会重复追加。`;
    } finally {
      button.disabled = false;
      search.disabled = false;
      grid.inert = false;
    }
  });
  render();
}
