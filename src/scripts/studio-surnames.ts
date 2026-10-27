import {
  buildSurnameImport,
  getSurnameByKey,
  normalizeSurnames,
  searchSurnames,
  surnameFieldLabels,
  surnameFieldText,
  surnameNeedsSourceHint,
  type SurnameContent,
} from '../lib/surnames';
import { getSection, saveSection } from '../lib/studio';

// An optional glob keeps the studio buildable before the dataset is delivered.
const modules = import.meta.glob('../data/surnames.json', { eager: true, import: 'default' });
const surnames = normalizeSurnames(Object.values(modules)[0]).sort((a, b) => a.order - b.order);

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
  const savedKey = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value;
  let selected = (
    getSurnameByKey(surnames, savedKey('surnameId')) ?? getSurnameByKey(surnames, savedKey('surnameSlug'))
  )?.id;
  const label = (surname: (typeof surnames)[number]) =>
    `${surname.name}${surname.traditional && surname.traditional !== surname.name ? `（${surname.traditional}）` : ''}`;
  const render = () => {
    const matches = searchSurnames(surnames, search.value);
    count.textContent = !surnames.length
      ? '百家姓资料整理中，你仍可在下方填写并保存家族资料。'
      : matches.length
        ? `找到 ${matches.length} 个姓氏`
        : '暂未找到这个姓氏，请换个拼法，或直接在下方填写。';
    search.disabled = !surnames.length;
    const visible = search.value.trim() ? matches : matches.slice(0, 60);
    if (!search.value.trim() && matches.length > visible.length)
      count.textContent = `共 ${matches.length} 个姓氏，先显示前 ${visible.length} 个；输入搜索可查找全部姓氏。`;
    grid.innerHTML = visible
      .map((surname) => {
        return `<button type="button" class="studio-surname-chip" data-surname-id="${escapeAttribute(surname.id)}" aria-label="${escapeAttribute(`选择${label(surname)}姓`)}" aria-pressed="${surname.id === selected}">${escapeHtml(label(surname))}</button>`;
      })
      .join('');
  };
  search.addEventListener('input', render);
  const showPreview = () => {
    const surname = getSurnameByKey(surnames, selected);
    if (!surname) return;
    const fields = Object.entries(surnameFieldLabels).map(([field, label]) => [
      label,
      surnameFieldText(surname, field as keyof typeof surnameFieldLabels),
    ]);
    const hint = surnameNeedsSourceHint(surname);
    preview.innerHTML = `<h3>${escapeHtml(label(surname))}姓资料</h3><dl>${fields
      .filter(([, value]) => value)
      .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
      .join('')}</dl>${hint ? `<p class="studio-note">${escapeHtml(hint)}</p>` : ''}`;
    const sources = surname.sources.map((source) => `${source.title}${source.url ? `：${source.url}` : ''}`).join('\n');
    if (sources) preview.innerHTML += `<p>${escapeHtml(sources)}</p>`;
    preview.hidden = false;
    actions.hidden = false;
  };
  grid.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-surname-id]') : null;
    const surname = getSurnameByKey(surnames, target?.dataset.surnameId);
    if (!surname) return;
    selected = surname.id;
    for (const [name, value] of [
      ['surnameId', surname.id],
      ['surnameSlug', surname.slug],
    ]) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.value = value;
    }
    form.dispatchEvent(new Event('input', { bubbles: true }));
    showPreview();
    status.textContent = '';
    render();
  });
  button.addEventListener('click', async () => {
    const surname = getSurnameByKey(surnames, selected);
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
  showPreview();
}
