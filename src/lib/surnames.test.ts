import { describe, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildSurnameImport,
  getSurnameByKey,
  normalizeSurnames,
  searchSurnames,
  surnameNeedsSourceHint,
  surnameFieldText,
  type SurnameContent,
} from './surnames';

const [huang] = normalizeSurnames([
  {
    slug: 'huang',
    name: '黄',
    traditional: '黃',
    pinyin: 'Huáng',
    romanizations: ['Wong', 'Ng', 'Oei'],
    junwang: ['江夏郡'],
    tanghao: ['江夏堂'],
    origin: '起源记载',
    migration: '迁居新加坡',
    generationPoems: [{ branch: '某支', poem: '世代相传' }],
    sources: [{ title: '姓氏书', url: 'https://example.org' }],
  },
]);

function merge(existing: SurnameContent, patches: ReturnType<typeof buildSurnameImport>): SurnameContent {
  return Object.fromEntries(([2, 3, 4] as const).map((step) => [step, { ...existing[step], ...patches[step] }]));
}

describe('normalizeSurnames', () => {
  it('accepts missing optional data files and empty payloads', () => {
    for (const raw of [undefined, null, [], {}, { surnames: [] }, { surnames: 'wrong' }])
      assert.deepEqual(normalizeSurnames(raw), []);
  });
  it('accepts both top-level formats', () => {
    assert.deepEqual(normalizeSurnames({ version: '1', surnames: [huang] }), [huang]);
  });
  it('drops invalid entries and tolerates wrong optional types', () => {
    const result = normalizeSurnames([
      null,
      1,
      [],
      {},
      { slug: 'a' },
      { name: '黄' },
      { slug: 5, name: '黄' },
      {
        slug: ' huang ',
        name: ' 黄 ',
        traditional: 42,
        pinyin: {},
        origin: false,
        migration: [],
        romanizations: [' Wong ', null, 7, ''],
        junwang: '郡',
        tanghao: {},
        dialectGroups: null,
        clanAssociations: 5,
        generationPoems: [null, { poem: 4 }, { branch: 7, poem: '字辈' }],
        sources: [false, { url: 'x' }, { title: '书', url: 9 }],
      },
    ]);
    assert.deepEqual(result, [
      {
        ...normalizeSurnames([{ slug: 'huang', name: '黄' }])[0],
        romanizations: ['Wong'],
        generationPoems: [{ branch: '', poem: '字辈' }],
        sources: [{ title: '书', url: '' }],
      },
    ]);
  });
});

describe('searchSurnames', () => {
  it('matches simplified, traditional, tone-free pinyin, and romanizations without case sensitivity', () => {
    for (const query of ['黄', '黃', 'HUANG', 'hua\u0301ng', ' wong ', 'ng', 'OEI', ''])
      assert.deepEqual(searchSurnames([huang], query), [huang]);
    assert.deepEqual(searchSurnames([huang], '陈'), []);
    assert.deepEqual(searchSurnames([], '黄'), []);
  });
});

describe('buildSurnameImport', () => {
  it('fills empty surname and hall and builds marked chapter text', () => {
    const patch = buildSurnameImport(huang, { 2: { surname: '  ' }, 4: { hallName: '' } });
    assert.equal(patch[2].surname, '黄');
    assert.ok(patch[2].story.includes('【百家姓资料·黄 huang】\n起源：起源记载'));
    assert.ok(patch[2].sources.includes('姓氏书：https://example.org'));
    assert.ok(patch[3].notes.includes('迁居新加坡'));
    assert.equal(patch[4].hallName, '江夏堂');
    assert.ok(patch[4].notes.includes('郡望：江夏郡'));
    assert.ok(patch[4].notes.includes('字辈：（某支）世代相传'));
  });
  it('preserves nonempty member text and unrelated content without mutating inputs', () => {
    const existing = {
      2: { surname: '本家黄氏', story: '原文\n ', sources: '家人口述', ancestralPlace: '海南' },
      3: { notes: '旧迁徙', migrationRows: [{ place: '文昌' }] },
      4: { hallName: '本家堂', notes: '本家字辈', dialect: '海南' },
    };
    const snapshot = structuredClone(existing);
    const patch = buildSurnameImport(huang, existing);
    assert.ok(!('surname' in patch[2]));
    assert.ok(!('hallName' in patch[4]));
    assert.ok(patch[2].story.startsWith(existing[2].story + '\n\n'));
    assert.ok(patch[2].sources.startsWith('家人口述\n\n'));
    assert.ok(patch[3].notes.startsWith('旧迁徙\n\n'));
    assert.ok(patch[4].notes.startsWith('本家字辈\n\n'));
    assert.deepEqual(merge(existing, patch)[3]?.migrationRows, existing[3].migrationRows);
    assert.deepEqual(existing, snapshot);
  });
  it('is idempotent even after member edits following the block', () => {
    const imported = merge({}, buildSurnameImport(huang));
    imported[2]!.story += '\n会员补充';
    assert.deepEqual(buildSurnameImport(huang, imported), { 2: {}, 3: {}, 4: {} });
  });
  it('keeps blocks for different surnames and does not duplicate either on re-import', () => {
    const [chen] = normalizeSurnames([{ ...huang, id: 'chen', slug: 'chen', name: '陈', origin: '陈姓起源' }]);
    const imported = merge({}, buildSurnameImport(huang));
    const combined = merge(imported, buildSurnameImport(chen, imported));
    assert.equal(combined[2]?.surname, '黄');
    assert.ok(String(combined[2]?.story).includes('【百家姓资料·黄 huang】'));
    assert.ok(String(combined[2]?.story).includes('【百家姓资料·陈 chen】'));
    assert.deepEqual(buildSurnameImport(huang, combined), {
      2: { surnameId: 'huang', surnameSlug: 'huang' },
      3: {},
      4: {},
    });
    assert.deepEqual(buildSurnameImport(chen, combined), { 2: {}, 3: {}, 4: {} });
  });
  it('does not create empty blocks or overwrite unexpected non-text values', () => {
    const [minimal] = normalizeSurnames([{ slug: 'chen', name: '陈' }]);
    assert.deepEqual(buildSurnameImport(minimal), {
      2: { surname: '陈', surnameId: 'chen', surnameSlug: 'chen' },
      3: {},
      4: {},
    });
    const patches = buildSurnameImport(huang, { 2: { surname: 7, story: ['原资料'] }, 4: { hallName: false } });
    assert.ok(!('story' in patches[2]));
    assert.ok(!('surname' in patches[2]));
    assert.ok(!('hallName' in patches[4]));
  });
});

const homographs = normalizeSurnames([
  { id: 'bjx-181-yu', slug: 'yu-181', name: '郁', traditional: '郁', origin: '郁姓起源' },
  { id: 'bjx-284-yu', slug: 'yu-284', name: '郁', traditional: '鬱', origin: '鬱姓起源' },
  { id: 'bjx-398-hou', slug: 'hou-398', name: '后', traditional: '後' },
  { id: 'bjx-479-hou', slug: 'hou-479', name: '后', traditional: '后' },
]);

describe('stable surname identity', () => {
  it('looks up homographs only by id or slug, with id taking precedence', () => {
    for (const surname of homographs) {
      assert.equal(getSurnameByKey(homographs, surname.id), surname);
      assert.equal(getSurnameByKey(homographs, surname.slug), surname);
      assert.deepEqual(searchSurnames(homographs, surname.id), [surname]);
      assert.deepEqual(searchSurnames(homographs, surname.slug), [surname]);
    }
    for (const key of ['郁', '后', '', undefined, 7]) assert.equal(getSurnameByKey(homographs, key), undefined);
    const collision = normalizeSurnames([{ id: 'other', slug: 'bjx-181-yu', name: '甲' }]);
    assert.equal(getSurnameByKey([...collision, ...homographs], 'bjx-181-yu'), homographs[0]);
  });
  it('appends independent homograph blocks and never duplicates either id', () => {
    const first = merge({}, buildSurnameImport(homographs[0]));
    const both = merge(first, buildSurnameImport(homographs[1], first));
    assert.ok(String(both[2]?.story).includes('郁 bjx-181-yu】'));
    assert.ok(String(both[2]?.story).includes('郁 bjx-284-yu】'));
    for (const surname of homographs.slice(0, 2)) {
      const patch = buildSurnameImport(surname, both);
      assert.equal(patch[2].story, undefined);
      assert.equal(patch[2].surname, undefined);
    }
    assert.equal(both[2]?.surnameId, 'bjx-284-yu');
    assert.equal(both[2]?.surnameSlug, 'yu-284');
  });
});

describe('FINAL schema', () => {
  it('normalizes missing and malformed additive fields safely', () => {
    const [surname] = normalizeSurnames([
      {
        slug: 'old',
        name: '旧',
        id: 7,
        order: '1',
        simplified: {},
        isCompound: 'false',
        founder: [],
        nanyang: 7,
        notableFigures: [null, { note: '无名' }, { name: '人', note: 5 }],
        fieldSources: { origin: [null, { title: '书', detail: 7, url: false }], founder: 7 },
        fieldStatus: { origin: 'verified', founder: 'wrong' },
      },
    ]);
    assert.equal(surname.id, 'old');
    assert.equal(surname.order, 0);
    assert.equal(surname.simplified, '旧');
    assert.equal(surname.isCompound, false);
    assert.equal(surname.founder, '');
    assert.equal(surname.nanyang, '');
    assert.deepEqual(surname.notableFigures, [{ name: '人', note: '' }]);
    assert.deepEqual(surname.fieldSources.origin, [{ title: '书', detail: '', url: '' }]);
    assert.equal(surname.fieldStatus.founder, 'needs_source');
  });
  it('imports verified fields with their sources and skips unverified populated fields', () => {
    const [surname] = normalizeSurnames([
      {
        ...huang,
        founder: '始祖',
        nanyang: '南来记载',
        notableFigures: [{ name: '人物', note: '事迹' }],
        dialectGroups: ['福建'],
        clanAssociations: ['会馆'],
        fieldStatus: {
          origin: 'needs_source',
          founder: 'verified',
          junwang: 'needs_source',
          tanghao: 'verified',
          notableFigures: 'verified',
          migration: 'needs_source',
          nanyang: 'verified',
          generationPoems: 'needs_source',
          dialectGroups: 'verified',
          clanAssociations: 'verified',
        },
        fieldSources: {
          founder: [{ title: '始祖书', detail: '第一章', url: 'https://example.org/founder' }],
          origin: [{ title: '不应引入', detail: '未证实' }],
        },
      },
    ]);
    const patch = buildSurnameImport(surname, { 4: { dialect: '家中方言', places: '祖屋' } });
    assert.ok(patch[2].story.includes('得姓始祖：始祖'));
    assert.ok(patch[2].story.includes('历史人物：人物：事迹'));
    assert.ok(!patch[2].story.includes('起源记载'));
    assert.ok(!patch[2].story.includes('江夏郡'));
    assert.ok(patch[2].sources.includes('始祖书（第一章）：https://example.org/founder'));
    assert.ok(!patch[2].sources.includes('不应引入'));
    assert.ok(patch[3].notes.includes('南来与新加坡：南来记载'));
    assert.ok(!patch[3].notes.includes('迁居新加坡'));
    assert.equal(patch[4].hallName, '江夏堂');
    assert.ok(patch[4].dialect.startsWith('家中方言\n\n'));
    assert.ok(patch[4].dialect.includes('福建'));
    assert.ok(patch[4].places.startsWith('祖屋\n\n'));
    assert.ok(patch[4].places.includes('会馆'));
    assert.ok(!patch[4].notes.includes('字辈'));
    assert.equal(surnameFieldText(surname, 'origin'), '');
    const saved = merge({ 4: { dialect: '家中方言', places: '祖屋' } }, patch);
    assert.deepEqual(buildSurnameImport(surname, saved), { 2: {}, 3: {}, 4: {} });
  });
  it('lists needs_source labels gently, including empty fields', () => {
    const [surname] = normalizeSurnames([
      {
        slug: 'a',
        name: '甲',
        fieldStatus: {
          junwang: 'needs_source',
          tanghao: 'needs_source',
          founder: 'verified',
          nanyang: 'needs_source',
        },
      },
    ]);
    assert.equal(surnameNeedsSourceHint(surname), '以下资料尚待考证，欢迎填写家中所知：郡望、堂号、南来与新加坡。');
    assert.equal(surnameNeedsSourceHint(huang), '');
  });
  it('keeps usable non-empty fields in old datasets without status', () => {
    assert.equal(huang.id, huang.slug);
    assert.equal(surnameFieldText(huang, 'origin'), '起源记载');
    assert.ok(buildSurnameImport(huang)[2].sources.includes('姓氏书'));
    const [partial] = normalizeSurnames([{ ...huang, fieldStatus: { origin: 'verified' } }]);
    assert.equal(surnameFieldText(partial, 'tanghao'), '江夏堂');
  });
  const datasetPath = new URL('../data/surnames.json', import.meta.url);
  it.skipIf(!existsSync(datasetPath))('normalizes every real entry and preserves unique ids and slugs', () => {
    const raw = JSON.parse(readFileSync(datasetPath, 'utf8'));
    const list = normalizeSurnames(raw);
    assert.equal(list.length, raw.surnames.length);
    assert.equal(new Set(list.map((surname) => surname.id)).size, list.length);
    assert.equal(new Set(list.map((surname) => surname.slug)).size, list.length);
  });
});
