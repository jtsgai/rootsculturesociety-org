import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { buildSurnameImport, normalizeSurnames, searchSurnames, type SurnameContent } from './surnames';

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
    assert.ok(patch[2].story.includes('【百家姓资料·黄】\n起源记载'));
    assert.ok(patch[2].sources.includes('姓氏书：https://example.org'));
    assert.ok(patch[3].notes.includes('迁居新加坡'));
    assert.equal(patch[4].hallName, '江夏堂');
    assert.ok(patch[4].notes.includes('郡望：江夏郡'));
    assert.ok(patch[4].notes.includes('字辈（某支）：世代相传'));
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
    const [chen] = normalizeSurnames([{ ...huang, slug: 'chen', name: '陈', origin: '陈姓起源' }]);
    const imported = merge({}, buildSurnameImport(huang));
    const combined = merge(imported, buildSurnameImport(chen, imported));
    assert.equal(combined[2]?.surname, '黄');
    assert.ok(String(combined[2]?.story).includes('【百家姓资料·黄】'));
    assert.ok(String(combined[2]?.story).includes('【百家姓资料·陈】'));
    assert.deepEqual(buildSurnameImport(huang, combined), { 2: {}, 3: {}, 4: {} });
    assert.deepEqual(buildSurnameImport(chen, combined), { 2: {}, 3: {}, 4: {} });
  });
  it('does not create empty blocks or overwrite unexpected non-text values', () => {
    const [minimal] = normalizeSurnames([{ slug: 'chen', name: '陈' }]);
    assert.deepEqual(buildSurnameImport(minimal), { 2: { surname: '陈' }, 3: {}, 4: {} });
    const patches = buildSurnameImport(huang, { 2: { surname: 7, story: ['原资料'] }, 4: { hallName: false } });
    assert.ok(!('story' in patches[2]));
    assert.ok(!('surname' in patches[2]));
    assert.ok(!('hallName' in patches[4]));
  });
});
