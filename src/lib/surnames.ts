import data from '../data/surnames.json';

export type FieldStatus = 'verified' | 'needs_source';
export type FieldSource = { title: string; detail: string; url?: string };
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
  generationPoems: { branch?: string; poem: string }[];
  dialectGroups: string[];
  clanAssociations: string[];
  sources: { title: string; url?: string }[];
  id: string;
  order: number;
  simplified: string;
  isCompound: boolean;
  founder: string;
  nanyang: string;
  notableFigures: { name: string; note: string }[];
  fieldSources: Record<string, FieldSource[]>;
  fieldStatus: Record<string, FieldStatus>;
};

export const surnameNote: string = data.note;
export const surnames = data.surnames as Surname[];

// Fields shown as sections on the detail page, in reading order.
export const detailFields = [
  { key: 'origin', label: '得姓起源', wide: true },
  { key: 'founder', label: '得姓始祖' },
  { key: 'junwang', label: '郡望' },
  { key: 'tanghao', label: '堂号' },
  { key: 'romanizations', label: '新加坡常见拼法' },
  { key: 'migration', label: '历史迁徙', wide: true },
  { key: 'nanyang', label: '南来与新加坡', wide: true },
  { key: 'dialectGroups', label: '方言群' },
  { key: 'clanAssociations', label: '新加坡宗亲会馆' },
  { key: 'notableFigures', label: '历史人物', wide: true },
  { key: 'generationPoems', label: '字辈', wide: true },
] as const;

const CORE_FIELDS = ['junwang', 'tanghao', 'origin', 'founder'];
export const verifiedCount = (s: Surname) => CORE_FIELDS.filter((f) => s.fieldStatus[f] === 'verified').length;
export const isEnriched = (s: Surname) => verifiedCount(s) > 0;
export const tonelessPinyin = (pinyin: string) =>
  pinyin
    .normalize('NFC')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
