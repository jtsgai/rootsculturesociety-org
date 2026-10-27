#!/usr/bin/env node
// Builds scripts/surnames-src/base.json — the 《百家姓》 surname list in classic order —
// from the raw source text (chinese-poetry dataset, traditional characters).
// The raw auto-parse (raw/bjx-base.json) is only used as a per-character
// simplified/pinyin lookup; segmentation is redone here.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'surnames-src');
const raw = JSON.parse(readFileSync(join(srcDir, 'raw/bjx.json'), 'utf8'));
const autoParse = JSON.parse(readFileSync(join(srcDir, 'raw/bjx-base.json'), 'utf8'));

// Single surnames that appear inside the compound-surname section (traditional form, as in the raw text).
const SINGLE_IN_COMPOUND_SECTION = new Set([...'仉督晉楚閆法汝鄢塗欽嶽帥緱亢況后有琴佘佴墨哈譙笪年愛陽佟言福']);
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
  伯赏: 'Bóshǎng',
  商牟: 'Shāngmóu',
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

const text = raw.paragraphs.join('').replace(/[，。、；\s]/gu, '');
if (!text.endsWith(CLOSING)) throw new Error('raw text does not end with the closing phrase');
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

const out = entries.map(({ order, slug, baseSlug, name, traditional, pinyin, isCompound, rawTraditional }) => ({
  id: `bjx-${String(order).padStart(3, '0')}-${baseSlug}`,
  order,
  slug,
  name,
  traditional,
  pinyin,
  isCompound,
  ...(rawTraditional !== traditional ? { rawTraditional } : {}),
}));

writeFileSync(join(srcDir, 'base.json'), JSON.stringify(out, null, 1) + '\n');
const singles = out.filter((e) => !e.isCompound).length;
console.log(`surnames: ${out.length} (single ${singles}, compound ${out.length - singles})`);
