export type Surname = {
  slug: string;
  name: string;
  traditional: string;
  pinyin: string;
  romanizations: string[];
  junwang: string[];
  tanghao: string[];
  origin: string;
  migration: string;
  generationPoems: { branch: string; poem: string }[];
  dialectGroups: string[];
  clanAssociations: string[];
  sources: { title: string; url: string }[];
};

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const string = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const strings = (value: unknown): string[] => array(value).map(string).filter(Boolean);

export function normalizeSurnames(raw: unknown): Surname[] {
  return array(Array.isArray(raw) ? raw : record(raw).surnames).flatMap((value) => {
    const item = record(value);
    const slug = string(item.slug);
    const name = string(item.name);
    if (!slug || !name) return [];
    return [
      {
        slug,
        name,
        traditional: string(item.traditional),
        pinyin: string(item.pinyin),
        romanizations: strings(item.romanizations),
        junwang: strings(item.junwang),
        tanghao: strings(item.tanghao),
        origin: string(item.origin),
        migration: string(item.migration),
        generationPoems: array(item.generationPoems).flatMap((value) => {
          const entry = record(value);
          const poem = string(entry.poem);
          return poem ? [{ branch: string(entry.branch), poem }] : [];
        }),
        dialectGroups: strings(item.dialectGroups),
        clanAssociations: strings(item.clanAssociations),
        sources: array(item.sources).flatMap((value) => {
          const entry = record(value);
          const title = string(entry.title);
          return title ? [{ title, url: string(entry.url) }] : [];
        }),
      },
    ];
  });
}

function searchKey(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function searchSurnames(list: readonly Surname[], query: string): Surname[] {
  const key = searchKey(query);
  return list.filter((item) =>
    [item.name, item.traditional, item.pinyin, ...item.romanizations].some((value) => searchKey(value).includes(key))
  );
}

export type SurnameContent = Partial<Record<2 | 3 | 4, Record<string, unknown>>>;
export type SurnameImport = Record<2 | 3 | 4, Record<string, string>>;

/** Only changed fields are returned; merge each patch into its existing chapter. */
export function buildSurnameImport(surname: Surname, existingContent: SurnameContent = {}): SurnameImport {
  const patches: SurnameImport = { 2: {}, 3: {}, 4: {} };
  const marker = `【百家姓资料·${surname.name}】`;
  const fill = (step: 2 | 3 | 4, field: string, value: string) => {
    const previous = existingContent[step]?.[field];
    if (value && (previous == null || (typeof previous === 'string' && !previous.trim()))) patches[step][field] = value;
  };
  const append = (step: 2 | 3 | 4, field: string, lines: string[]) => {
    const body = lines.filter(Boolean).join('\n');
    const previous = existingContent[step]?.[field];
    // Preserve unexpected non-text values rather than silently replacing member data.
    if (!body || (previous != null && typeof previous !== 'string')) return;
    const text = previous ?? '';
    if (!text.includes(marker)) patches[step][field] = `${text}${text ? '\n\n' : ''}${marker}\n${body}`;
  };
  fill(2, 'surname', surname.name);
  append(2, 'story', [surname.origin]);
  append(
    2,
    'sources',
    surname.sources.map((source) => `${source.title}${source.url ? `：${source.url}` : ''}`)
  );
  append(3, 'notes', [surname.migration]);
  fill(4, 'hallName', surname.tanghao.join('、'));
  append(4, 'notes', [
    surname.tanghao.length ? `堂号：${surname.tanghao.join('、')}` : '',
    surname.junwang.length ? `郡望：${surname.junwang.join('、')}` : '',
    ...surname.generationPoems.map((entry) => `字辈${entry.branch ? `（${entry.branch}）` : ''}：${entry.poem}`),
  ]);
  return patches;
}
