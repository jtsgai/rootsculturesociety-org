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

// Provenance of the surname list itself: base text, the standard edition the segmentation follows, and every
// deliberate deviation from a plain two-character split of the compound section (scripts/build-surnames-base.mjs).
const SOURCE_EDITION = {
  baseText: {
    title: '《百家姓》繁体文本（chinese-poetry 开源古诗词数据集 baijiaxing.json）',
    url: 'https://github.com/chinese-poetry/chinese-poetry',
    file: 'scripts/surnames-src/raw/bjx.json',
  },
  standardEdition: {
    title: '通行本《百家姓》：568 字（含末句“百家姓终”），504 姓 = 单姓 444 + 复姓 60',
    countReference: { title: '维基百科「百家姓」条', url: 'https://zh.wikipedia.org/wiki/百家姓' },
    textReference: { title: '维基文库《百家姓》', url: 'https://zh.wikisource.org/wiki/百家姓' },
  },
  notes: [
    '逐字校对：原文与维基文库本均为 568 字，无缺字，补字清单（TEXT_PATCHES）为空。27 处差异均为异体或简繁转换字形（如 範/范、蔔/卜、鐘/鍾、萬/万、台/臺），已在切分脚本的字形校订表中处理；另“荀羊於惠”维基文库作“荀於羊惠”，从原文。',
    '更正旧说明：此前 501 姓（单姓 438、复姓 63）的成因并非“商牟、伯赏、第五被作复姓”，而是切分脚本的单姓集合漏了“归”“海”，把“归海”误作复姓，再加上“商牟”“伯赏”按复姓切分。',
    '调整一：“归海”拆为单姓“归”“海”（与通行 444 + 60 计数一致）。',
    '调整二：“商牟”拆为单姓“商”“牟”。',
    '调整三：“伯赏”拆为单姓“伯”“赏”。需求方原希望保留“伯赏”为复姓，但字数固定为 564（不含“百家姓终”）时，504 姓必为单姓 444、复姓 60；保留“伯赏”则最多 503 姓。为与通行本计数一致，此项需求已被推翻，“伯赏”按两个单姓处理。',
    '“第五”保留为复姓。',
    '结果：504 姓（单姓 444、复姓 60）。新增 6 姓（归、海、商、牟、伯、赏）只有简繁与读音，其余字段为 needs_source；原有条目的 id 与 slug 保持不变（因此第 473 位以后部分条目 id/slug 中的数字与 order 不一致），删去的旧条目为 bjx-471-guihai、bjx-486-shangmou、bjx-489-boshang。',
  ],
};

const out = {
  version: '1.1.0',
  title: '百家姓',
  note: '次序依《百家姓》原文。共 504 姓（单姓 444、复姓 60），与通行本一致：“归海”“商牟”“伯赏”各按两个单姓计，“第五”为复姓。',
  sourceEdition: SOURCE_EDITION,
  surnames,
};
writeFileSync(join(root, 'src/data/surnames.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote src/data/surnames.json: ${surnames.length} surnames, ${enrichment.size} enriched`);
