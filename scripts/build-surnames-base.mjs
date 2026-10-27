#!/usr/bin/env node
// Builds scripts/surnames-src/base.json — the 《百家姓》 surname list in classic order —
// from the raw source text (chinese-poetry dataset, traditional characters).
// The raw auto-parse (raw/bjx-base.json) is only used as a per-character
// simplified/pinyin lookup; segmentation is redone here.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'surnames-src');
const raw = JSON.parse(readFileSync(join(srcDir, 'raw/bjx.json'), 'utf8'));
const autoParse = JSON.parse(readFileSync(join(srcDir, 'raw/bjx-base.json'), 'utf8'));

// Standard edition (commonly cited): 568 characters including the closing 百家姓终 — 504 surnames, 444 single + 60 compound.
const STANDARD = { chars: 568, total: 504, single: 444, compound: 60 };
// Explicit patch list for characters missing from the raw text: { after: '<preceding chars>', insert: '<chars>', reason }.
// Empty: a character-by-character comparison with the Wikisource text (zh.wikisource.org/wiki/百家姓) found the
// raw text complete at 568 characters; the 27 mismatches are variant glyphs (handled by TRADITIONAL_FIXES below)
// and the order of 荀羊於惠 (Wikisource: 荀於羊惠), where the raw text follows the common edition.
const TEXT_PATCHES = [];
// Single surnames that appear inside the compound-surname section (traditional form, as in the raw text).
const SINGLE_IN_COMPOUND_SECTION = new Set([...'仉督晉楚閆法汝鄢塗欽嶽帥緱亢況后有琴佘佴墨哈譙笪年愛陽佟言福']);
// Pairs in the compound section that the standard 444 + 60 count treats as two single surnames
// (cf. the 百家姓 article on zh.wikipedia.org). 第五 stays compound. See sourceEdition.notes in merge-surnames.mjs.
const SPLIT_INTO_SINGLES = ['歸海', '商牟', '伯賞'];
for (const pair of SPLIT_INTO_SINGLES) for (const ch of pair) SINGLE_IN_COMPOUND_SECTION.add(ch);
const COMPOUND_SECTION_START = '萬俟';
const CLOSING = '百家姓終';

// The raw text's simplified→traditional conversion picks the wrong traditional form for some surnames.
const TRADITIONAL_FIXES = { 範: '范', 蔔: '卜', 鐘: '鍾', 幹: '干', 鹹: '咸', 遊: '游', 塗: '涂', 裏: '里', 嶽: '岳' };
// Homographs after simplification: 鬱 and 後 are distinct surnames from 郁 and 后 (keyed by order).
const TRADITIONAL_BY_ORDER = { 284: '鬱', 398: '後' };
// Simplified-form fixes keyed by raw traditional surname (於 is kept as a distinct surname, cf. 《通用规范汉字表》).
const SIMPLIFIED_FIXES = { 於: '於' };

// Surname readings differ from the default character reading; keyed by simplified surname.
const PINYIN_OVERRIDES = {
  单: 'Shàn',
  解: 'Xiè',
  区: 'Ōu',
  查: 'Zhā',
  仇: 'Qiú',
  曾: 'Zēng',
  盖: 'Gě',
  朴: 'Piáo',
  乐: 'Yuè',
  覃: 'Qín',
  缪: 'Miào',
  种: 'Chóng',
  柏: 'Bǎi',
  贲: 'Bēn',
  能: 'Nài',
  阚: 'Kàn',
  薄: 'Bó',
  宿: 'Sù',
  句: 'Gōu',
  尉: 'Yù',
  祭: 'Zhài',
  莘: 'Shēn',
  都: 'Dū',
  郇: 'Huán',
  谌: 'Chén',
  车: 'Chē',
  华: 'Huà',
  宓: 'Fú',
  佴: 'Nài',
  仉: 'Zhǎng',
  卜: 'Bǔ',
  翟: 'Zhái',
  乜: 'Niè',
  蔚: 'Yù',
  秘: 'Bì',
  燕: 'Yān',
  那: 'Nā',
  召: 'Shào',
  冼: 'Xiǎn',
  隗: 'Wěi',
  繁: 'Pó',
  员: 'Yùn',
  晁: 'Cháo',
  哈: 'Hǎ',
  厍: 'Shè',
  养: 'Yǎng',
  弘: 'Hóng',
  於: 'Yū',
  万: 'Wàn',
  长: 'Cháng',
  和: 'Hé',
  应: 'Yīng',
  叶: 'Yè',
  洗: 'Xiǎn',
  尉迟: 'Yùchí',
  万俟: 'Mòqí',
  长孙: 'Zhǎngsūn',
  澹台: 'Tántái',
  单于: 'Chányú',
  乐正: 'Yuèzhèng',
  亓官: 'Qíguān',
  宰父: 'Zǎifǔ',
  谷梁: 'Gǔliáng',
  夹谷: 'Jiágǔ',
  令狐: 'Línghú',
  皇甫: 'Huángfǔ',
  公冶: 'Gōngyě',
  段干: 'Duàngān',
  壤驷: 'Rǎngsì',
  漆雕: 'Qīdiāo',
  子车: 'Zǐjū',
};

// Romanised slug owners for homophones: the listed surname gets the bare slug; others get `<slug>-<order>`.
const SLUG_OWNERS = {
  liu: '刘',
  chen: '陈',
  zhang: '张',
  wang: '王',
  li: '李',
  huang: '黄',
  wu: '吴',
  xu: '许',
  he: '何',
  zhou: '周',
  zheng: '郑',
  yang: '杨',
  yu: '余',
  ye: '叶',
  hu: '胡',
  zhu: '朱',
};

const charSimplified = new Map();
const charPinyin = new Map();
for (const entry of autoParse) {
  const syllables = entry.pinyin_auto.trim().split(/\s+/);
  [...entry.traditional].forEach((ch, i) => {
    charSimplified.set(ch, entry.name[i]);
    if (syllables.length === entry.traditional.length) charPinyin.set(ch, syllables[i]);
  });
}

let text = raw.paragraphs.join('').replace(/[，。、；\s]/gu, '');
for (const { after, insert } of TEXT_PATCHES) {
  if (text.split(after).length !== 2) throw new Error(`patch anchor "${after}" must occur exactly once`);
  text = text.replace(after, after + insert);
}
if (!text.endsWith(CLOSING)) throw new Error('raw text does not end with the closing phrase');
if ([...text].length !== STANDARD.chars) throw new Error(`text has ${[...text].length} chars, standard ${STANDARD.chars}`);
for (const pair of SPLIT_INTO_SINGLES) if (!text.includes(pair)) throw new Error(`split pair ${pair} not in text`);
const body = [...text.slice(0, -CLOSING.length)];
const split = text.indexOf(COMPOUND_SECTION_START);
const tokens = body.slice(0, split);
for (let i = split; i < body.length;) {
  if (SINGLE_IN_COMPOUND_SECTION.has(body[i])) tokens.push(body[i++]);
  else {
    tokens.push(body[i] + body[i + 1]);
    i += 2;
  }
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const toneless = (s) =>
  s
    .normalize('NFC')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

const entries = tokens.map((rawTrad, idx) => {
  const order = idx + 1;
  const simplified = SIMPLIFIED_FIXES[rawTrad] ?? [...rawTrad].map((ch) => charSimplified.get(ch) ?? ch).join('');
  const traditional = TRADITIONAL_BY_ORDER[order] ?? [...rawTrad].map((ch) => TRADITIONAL_FIXES[ch] ?? ch).join('');
  const pinyin =
    PINYIN_OVERRIDES[simplified] ?? capitalize([...rawTrad].map((ch) => charPinyin.get(ch) ?? '').join(''));
  if (!pinyin) throw new Error(`no pinyin for ${rawTrad}`);
  return {
    order,
    name: simplified,
    traditional,
    pinyin,
    isCompound: [...rawTrad].length === 2,
    rawTraditional: rawTrad,
  };
});

const bySlug = new Map();
for (const e of entries) {
  const base = toneless(e.pinyin.normalize('NFC'));
  e.baseSlug = base;
  bySlug.set(base, [...(bySlug.get(base) ?? []), e]);
}
for (const [base, group] of bySlug) {
  const owner = group.length === 1 ? group[0] : (group.find((e) => e.name === SLUG_OWNERS[base]) ?? group[0]);
  for (const e of group) e.slug = e === owner ? base : `${base}-${e.order}`;
}

// id and slug are stable once published: an entry already in the previous base.json (matched by simplified +
// traditional form) keeps its id and slug even if its order changed, so the numbers in older ids/slugs may
// differ from `order`. Only entries new to the list get an id/slug derived from their current order.
const basePath = join(srcDir, 'base.json');
const previous = new Map();
for (const p of existsSync(basePath) ? JSON.parse(readFileSync(basePath, 'utf8')) : []) {
  const key = `${p.name}|${p.traditional}`;
  if (previous.has(key)) throw new Error(`previous base.json: ambiguous key ${key}`);
  previous.set(key, p);
}
const kept = entries.map((e) => previous.get(`${e.name}|${e.traditional}`));
const takenIds = new Set(kept.filter(Boolean).map((p) => p.id));
const takenSlugs = new Set(kept.filter(Boolean).map((p) => p.slug));
const changes = { added: [], removed: [] };
entries.forEach((e, i) => {
  if (kept[i]) {
    e.id = kept[i].id;
    e.slug = kept[i].slug;
    return;
  }
  e.id = `bjx-${String(e.order).padStart(3, '0')}-${e.baseSlug}`;
  if (takenSlugs.has(e.slug)) e.slug = `${e.baseSlug}-${e.order}`;
  if (takenIds.has(e.id) || takenSlugs.has(e.slug)) throw new Error(`id/slug collision for ${e.name}`);
  takenIds.add(e.id);
  takenSlugs.add(e.slug);
  if (previous.size) changes.added.push(`${e.name} ${e.id} /${e.slug}/`);
});
const current = new Set(entries.map((e) => `${e.name}|${e.traditional}`));
for (const [key, p] of previous) if (!current.has(key)) changes.removed.push(`${p.name} ${p.id} /${p.slug}/`);

const out = entries.map(({ id, order, slug, name, traditional, pinyin, isCompound, rawTraditional }) => ({
  id,
  order,
  slug,
  name,
  traditional,
  pinyin,
  isCompound,
  ...(rawTraditional !== traditional ? { rawTraditional } : {}),
}));

writeFileSync(basePath, JSON.stringify(out, null, 1) + '\n');
const singles = out.filter((e) => !e.isCompound).length;
console.log(`surnames: ${out.length} (single ${singles}, compound ${out.length - singles})`);
if (singles !== STANDARD.single || out.length - singles !== STANDARD.compound)
  throw new Error(`expected ${STANDARD.single} single + ${STANDARD.compound} compound`);
for (const line of changes.removed) console.log(`removed: ${line}`);
for (const line of changes.added) console.log(`added:   ${line}`);
