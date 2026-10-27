#!/usr/bin/env node
// Merges scripts/surnames-src/base.json with the sourced enrichment chunks in
// scripts/surnames-src/enrich/*.json into src/data/surnames.json.
// Schema: docs/surnames-schema.md (shared fields per /workspace/team/rcss-surnames-schema.md + additive fields).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'scripts/surnames-src');
const base = JSON.parse(readFileSync(join(srcDir, 'base.json'), 'utf8'));

export const STATUS_FIELDS = [
  'traditional',
  'pinyin',
  'romanizations',
  'junwang',
  'tanghao',
  'origin',
  'founder',
  'migration',
  'nanyang',
  'notableFigures',
  'generationPoems',
  'dialectGroups',
  'clanAssociations',
];
const ENRICH_FIELDS = STATUS_FIELDS.filter((f) => !['traditional', 'pinyin', 'generationPoems'].includes(f));
const STRING_FIELDS = new Set(['origin', 'founder', 'migration', 'nanyang']);

const TEXT_SOURCE = {
  title: '《百家姓》繁体文本（chinese-poetry 开源古诗词数据集）',
  detail: '姓氏次序与字形取自原文；繁体字形按姓氏用字校订（见 scripts/build-surnames-base.mjs）',
  url: 'https://github.com/chinese-poetry/chinese-poetry',
};
const PINYIN_SOURCE = {
  title: 'pypinyin 注音 + 姓氏读音校订表',
  detail: '按字自动注音；多音姓氏（如单、解、仇、曾、尉迟、万俟）以 scripts/build-surnames-base.mjs 中的校订表覆盖',
  url: 'https://github.com/mozillazg/python-pinyin',
};

const enrichment = new Map();
for (const file of readdirSync(join(srcDir, 'enrich'))
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  for (const item of JSON.parse(readFileSync(join(srcDir, 'enrich', file), 'utf8'))) {
    const matches = base.filter((e) => e.name === item.name);
    if (matches.length !== 1) throw new Error(`${file}: "${item.name}" matches ${matches.length} base entries`);
    if (enrichment.has(item.name)) throw new Error(`${file}: duplicate enrichment for ${item.name}`);
    enrichment.set(item.name, { ...item, file });
  }
}

const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null);

const surnames = base.map((b) => {
  const extra = enrichment.get(b.name) ?? { fieldSources: {} };
  const entry = {
    slug: b.slug,
    name: b.name,
    traditional: b.traditional,
    pinyin: b.pinyin,
    romanizations: [],
    junwang: [],
    tanghao: [],
    origin: '',
    migration: '',
    generationPoems: [],
    dialectGroups: [],
    clanAssociations: [],
    sources: [],
    id: b.id,
    order: b.order,
    simplified: b.name,
    isCompound: b.isCompound,
    founder: '',
    nanyang: '',
    notableFigures: [],
    fieldSources: { traditional: [TEXT_SOURCE], pinyin: [PINYIN_SOURCE] },
    fieldStatus: {},
  };
  for (const field of ENRICH_FIELDS) {
    const value = extra[field];
    if (!isFilled(value)) continue;
    if (STRING_FIELDS.has(field) !== (typeof value === 'string')) throw new Error(`${b.name}.${field}: wrong type`);
    entry[field] = typeof value === 'string' ? value.trim() : value;
    const cited = extra.fieldSources?.[field] ?? [];
    if (!cited.length) throw new Error(`${b.name}.${field}: value without fieldSources (${extra.file})`);
    entry.fieldSources[field] = cited;
  }
  for (const field of STATUS_FIELDS) entry.fieldStatus[field] = isFilled(entry[field]) ? 'verified' : 'needs_source';
  const seen = new Set();
  for (const field of STATUS_FIELDS) {
    for (const { title, url } of entry.fieldSources[field] ?? []) {
      const key = `${title}|${url ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entry.sources.push(url ? { title, url } : { title });
    }
  }
  return entry;
});

const out = {
  version: '1.0.0',
  title: '百家姓',
  note: '次序依《百家姓》原文。原文去掉“百家姓终”后共 564 字，按姓氏切分得 501 姓（单姓 438、复姓 63）。通行说法为 504 姓（单姓 444、复姓 60）；按字数推算，差额恰等于把商牟、伯赏、第五各视作两个单姓。本数据按复姓处理，此差异待考证。',
  surnames,
};
writeFileSync(join(root, 'src/data/surnames.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote src/data/surnames.json: ${surnames.length} surnames, ${enrichment.size} enriched`);
