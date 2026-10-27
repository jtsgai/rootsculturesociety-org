export type Surname = {
  id: string;
  order: number;
  simplified: string;
  isCompound: boolean;
  founder: string;
  nanyang: string;
  notableFigures: { name: string; note: string }[];
  fieldSources: Record<string, { title: string; detail: string; url?: string }[]>;
  fieldStatus: Record<string, 'verified' | 'needs_source'>;
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
        id: string(item.id) || slug,
        order: typeof item.order === 'number' && Number.isFinite(item.order) && item.order > 0 ? item.order : 0,
        simplified: string(item.simplified) || name,
        isCompound: typeof item.isCompound === 'boolean' ? item.isCompound : name.length > 1,
        founder: string(item.founder),
        nanyang: string(item.nanyang),
        notableFigures: array(item.notableFigures).flatMap((value) => {
          const figure = record(value);
          const name = string(figure.name);
          return name ? [{ name, note: string(figure.note) }] : [];
        }),
        fieldSources: Object.fromEntries(
          Object.entries(record(item.fieldSources)).map(([field, value]) => [
            field,
            array(value).flatMap((value) => {
              const source = record(value);
              const title = string(source.title);
              return title ? [{ title, detail: string(source.detail), url: string(source.url) }] : [];
            }),
          ])
        ),
        fieldStatus: Object.fromEntries(
          Object.entries(record(item.fieldStatus)).map(([field, value]) => [
            field,
            value === 'verified' ? 'verified' : 'needs_source',
          ])
        ),
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
    [item.name, item.simplified, item.traditional, item.pinyin, ...item.romanizations, item.slug, item.id].some(
      (value) => searchKey(value).includes(key)
    )
  );
}

/** Names are deliberately excluded: distinct surnames can share the same simplified form. */
export function getSurnameByKey(list: readonly Surname[], key: unknown): Surname | undefined {
  if (typeof key !== 'string' || !key.trim()) return undefined;
  return list.find((item) => item.id === key) ?? list.find((item) => item.slug === key);
}

export const surnameFieldLabels = {
  traditional: '繁体',
  pinyin: '拼音',
  romanizations: '常见拼法',
  origin: '起源',
  founder: '得姓始祖',
  junwang: '郡望',
  tanghao: '堂号',
  notableFigures: '历史人物',
  migration: '迁徙',
  nanyang: '南来与新加坡',
  generationPoems: '字辈',
  dialectGroups: '方言群',
  clanAssociations: '宗亲会馆',
} as const;

type SurnameField = keyof typeof surnameFieldLabels;

export function isSurnameFieldUsable(surname: Surname, field: SurnameField): boolean {
  return surname.fieldStatus[field] === undefined || surname.fieldStatus[field] === 'verified';
}

export function surnameNeedsSourceHint(surname: Surname): string {
  const labels = (Object.keys(surnameFieldLabels) as SurnameField[])
    .filter((field) => surname.fieldStatus[field] === 'needs_source')
    .map((field) => surnameFieldLabels[field]);
  return labels.length ? `以下资料尚待考证，欢迎填写家中所知：${labels.join('、')}。` : '';
}

export function surnameFieldText(surname: Surname, field: SurnameField): string {
  if (!isSurnameFieldUsable(surname, field)) return '';
  if (field === 'notableFigures')
    return surname.notableFigures.map((figure) => `${figure.name}${figure.note ? `：${figure.note}` : ''}`).join('\n');
  if (field === 'generationPoems')
    return surname.generationPoems
      .map((entry) => `${entry.branch ? `（${entry.branch}）` : ''}${entry.poem}`)
      .join('\n');
  const value = surname[field];
  return Array.isArray(value) ? value.join('、') : value;
}

export type SurnameContent = Partial<Record<2 | 3 | 4, Record<string, unknown>>>;
export type SurnameImport = Record<2 | 3 | 4, Record<string, string>>;

/** Only changed fields are returned; merge each patch into its existing chapter. */
export function buildSurnameImport(surname: Surname, existingContent: SurnameContent = {}): SurnameImport {
  const patches: SurnameImport = { 2: {}, 3: {}, 4: {} };
  const marker = `【百家姓资料·${surname.name} ${surname.id}】`;
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
  // Selection metadata follows the chosen entry while member display text is preserved.
  for (const [field, value] of [
    ['surnameId', surname.id],
    ['surnameSlug', surname.slug],
  ]) {
    if (existingContent[2]?.[field] !== value) patches[2][field] = value;
  }
  fill(2, 'surname', surname.name);
  const chapter2Fields: SurnameField[] = ['origin', 'founder', 'junwang', 'tanghao', 'notableFigures'];
  const labeled = (field: SurnameField) => {
    const value = surnameFieldText(surname, field);
    return value ? `${surnameFieldLabels[field]}：${value}` : '';
  };
  append(2, 'story', chapter2Fields.map(labeled));
  const sources = chapter2Fields
    .filter((field) => surnameFieldText(surname, field))
    .flatMap((field) =>
      (surname.fieldSources[field] ?? []).map(
        (source) =>
          `${surnameFieldLabels[field]}：${source.title}${source.detail ? `（${source.detail}）` : ''}${source.url ? `：${source.url}` : ''}`
      )
    );
  // Older datasets have only the aggregate bibliography.
  if (!Object.keys(surname.fieldStatus).length && !Object.keys(surname.fieldSources).length)
    sources.push(...surname.sources.map((source) => `${source.title}${source.url ? `：${source.url}` : ''}`));
  append(2, 'sources', [...new Set(sources)]);
  append(
    3,
    'notes',
    ['migration', 'nanyang'].map((field) => labeled(field as SurnameField))
  );
  fill(4, 'hallName', surnameFieldText(surname, 'tanghao'));
  append(4, 'dialect', [surnameFieldText(surname, 'dialectGroups')]);
  append(4, 'places', [surnameFieldText(surname, 'clanAssociations')]);
  append(
    4,
    'notes',
    ['tanghao', 'junwang', 'generationPoems'].map((field) => labeled(field as SurnameField))
  );
  return patches;
}
