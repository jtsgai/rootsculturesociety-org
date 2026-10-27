#!/usr/bin/env node
// Validates src/data/surnames.json against docs/surnames-schema.md and prints coverage stats.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/surnames.json'), 'utf8'));

// Standard edition: 504 surnames, 444 single + 60 compound (see `sourceEdition` in the data file).
const EXPECTED_TOTAL = 504;
const EXPECTED_SINGLE = 444;
const EXPECTED_COMPOUND = 60;
const STATUS_FIELDS = [
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
const SHARED_TYPES = {
  slug: 'string',
  name: 'string',
  traditional: 'string',
  pinyin: 'string',
  romanizations: 'string[]',
  junwang: 'string[]',
  tanghao: 'string[]',
  origin: 'string',
  migration: 'string',
  generationPoems: 'object[]',
  dialectGroups: 'string[]',
  clanAssociations: 'string[]',
  sources: 'object[]',
};
const ADDITIVE_TYPES = {
  id: 'string',
  order: 'number',
  simplified: 'string',
  isCompound: 'boolean',
  founder: 'string',
  nanyang: 'string',
  notableFigures: 'object[]',
  fieldSources: 'object',
  fieldStatus: 'object',
};
// Fields that make an entry "fully verified" for the studio auto-fill and the public page.
const CORE_FIELDS = ['junwang', 'tanghao', 'origin', 'founder', 'migration', 'nanyang', 'notableFigures'];

const errors = [];
const fail = (msg) => errors.push(msg);
const typeOf = (v) =>
  Array.isArray(v)
    ? v.every((x) => typeof x === 'string') && v.length
      ? 'string[]'
      : v.length
        ? 'object[]'
        : 'array'
    : v === null
      ? 'null'
      : typeof v;
const typeOk = (v, want) => {
  const got = typeOf(v);
  if (got === want) return true;
  return got === 'array' && want.endsWith('[]');
};
const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null);

if (typeof data.version !== 'string' || !Array.isArray(data.surnames))
  fail('top level must be { version: string, surnames: [] }');
const list = data.surnames ?? [];
if (list.length !== EXPECTED_TOTAL) fail(`expected ${EXPECTED_TOTAL} surnames, found ${list.length}`);
const compounds = list.filter((e) => e.isCompound).length;
if (compounds !== EXPECTED_COMPOUND || list.length - compounds !== EXPECTED_SINGLE)
  fail(
    `expected ${EXPECTED_SINGLE} single + ${EXPECTED_COMPOUND} compound, found ${list.length - compounds} + ${compounds}`
  );
const edition = data.sourceEdition;
if (typeof edition?.baseText?.title !== 'string' || typeof edition?.standardEdition?.title !== 'string')
  fail('sourceEdition needs baseText.title and standardEdition.title');
if (!Array.isArray(edition?.notes) || !edition.notes.length || !edition.notes.every((n) => typeof n === 'string'))
  fail('sourceEdition.notes must be a non-empty string[]');

const unique = (key) => {
  const seen = new Set();
  for (const e of list) {
    if (seen.has(e[key])) fail(`duplicate ${key}: ${e[key]}`);
    seen.add(e[key]);
  }
};
['id', 'order', 'slug'].forEach(unique);

list.forEach((e, i) => {
  const at = `${e.id ?? `#${i}`}`;
  if (e.order !== i + 1) fail(`${at}: order ${e.order} out of sequence (expected ${i + 1})`);
  if (!/^bjx-\d{3}-[a-z]+$/.test(e.id ?? '')) fail(`${at}: bad id`);
  if (!/^[a-z]+(-\d+)?$/.test(e.slug ?? '')) fail(`${at}: bad slug`);
  for (const [field, want] of Object.entries({ ...SHARED_TYPES, ...ADDITIVE_TYPES })) {
    if (!(field in e)) fail(`${at}: missing ${field}`);
    else if (!typeOk(e[field], want)) fail(`${at}: ${field} should be ${want}, got ${typeOf(e[field])}`);
  }
  if (e.name !== e.simplified) fail(`${at}: name and simplified differ`);
  if ([...(e.name ?? '')].length !== (e.isCompound ? 2 : 1)) fail(`${at}: isCompound does not match name length`);
  for (const s of e.sources ?? [])
    if (typeof s.title !== 'string' || ('url' in s && typeof s.url !== 'string')) fail(`${at}: bad sources item`);
  for (const p of e.generationPoems ?? [])
    if (typeof p.poem !== 'string') fail(`${at}: generationPoems item needs poem`);
  for (const field of STATUS_FIELDS) {
    const status = e.fieldStatus?.[field];
    const cited = e.fieldSources?.[field] ?? [];
    if (!['verified', 'needs_source'].includes(status)) fail(`${at}: fieldStatus.${field} missing/invalid`);
    if (filled(e[field])) {
      if (!cited.length) fail(`${at}: ${field} has content but no fieldSources`);
      if (status !== 'verified') fail(`${at}: ${field} has content but status ${status}`);
      for (const s of cited)
        if (!s.title || !s.detail) fail(`${at}: fieldSources.${field} item needs title and detail`);
    } else {
      if (status !== 'needs_source') fail(`${at}: ${field} is empty but status ${status}`);
      if (cited.length) fail(`${at}: ${field} is empty but has fieldSources`);
    }
  }
});

const count = (pred) => list.filter(pred).length;
const verifiedCore = (e) => CORE_FIELDS.filter((f) => e.fieldStatus?.[f] === 'verified').length;
console.log(
  `surnames: ${list.length} (single ${count((e) => !e.isCompound)}, compound ${count((e) => e.isCompound)}); expected ${EXPECTED_TOTAL}`
);
console.log(
  `fully verified (all ${CORE_FIELDS.length} core fields): ${count((e) => verifiedCore(e) === CORE_FIELDS.length)}`
);
console.log(`partially enriched: ${count((e) => verifiedCore(e) > 0 && verifiedCore(e) < CORE_FIELDS.length)}`);
console.log(`basics only (core fields needs_source): ${count((e) => verifiedCore(e) === 0)}`);
console.log('per-field verified / needs_source:');
for (const f of STATUS_FIELDS)
  console.log(
    `  ${f.padEnd(17)} ${String(count((e) => e.fieldStatus?.[f] === 'verified')).padStart(3)} / ${count((e) => e.fieldStatus?.[f] === 'needs_source')}`
  );

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.slice(0, 50).forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}
console.log('\nOK');
