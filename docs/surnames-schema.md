# 百家姓数据 `src/data/surnames.json`

公开页 `/surnames/` 与会员谱坊（相册家谱 studio）自动填写「姓氏渊源 / 籍贯文化」时共用的数据文件。
共享字段与 `/workspace/team/rcss-surnames-schema.md`（草案 v0）一致；本仓库新增的字段只做**加法**，不改变任何共享字段的名称或类型。

## 生成流程

```
scripts/surnames-src/raw/bjx.json        《百家姓》繁体原文（chinese-poetry 数据集）
scripts/surnames-src/raw/bjx-base.json   早期自动切分结果，只用作逐字简体/拼音对照
        │  node scripts/build-surnames-base.mjs
        ▼
scripts/surnames-src/base.json           504 姓，原文次序，id/slug/简繁/拼音/是否复姓
        │  + scripts/surnames-src/enrich/*.json（每档约 4–5 姓，逐字段附出处）
        │  node scripts/merge-surnames.mjs
        ▼
src/data/surnames.json
```

- `npm run build:surnames` — 重建 base 并合并。
- `npm run validate:surnames` — 校验并打印覆盖率。

切分规则写在 `build-surnames-base.mjs`：复姓段（自「万俟」起）按两字切分，但仉、督、晋…钦、岳…琴、佘、佴、墨…佟、言、福为单姓；「归海」「商牟」「伯赏」按通行本拆为两个单姓（`SPLIT_INTO_SINGLES`），「第五」仍为复姓。
繁体字形校订（如 範→范、蔔→卜、嶽→岳；第 284 位为「鬱」、第 398 位为「後」）与姓氏读音校订（单 Shàn、解 Xiè、仇 Qiú、曾 Zēng、盖 Gě、尉迟 Yùchí、万俟 Mòqí、长孙 Zhǎngsūn 等）也在该脚本中。

### 关于总数：504（单姓 444、复姓 60）

通行本《百家姓》共 568 字（含末句「百家姓终」），504 姓，其中单姓 444、复姓 60。原文与维基文库本逐字校对，同为 568 字、无缺字，
差异只是异体字形，所以补字清单 `TEXT_PATCHES` 为空（如日后发现缺字，须写入该清单并注明理由）。

姓氏用字固定为 564 字时，504 姓必为单姓 444、复姓 60。旧版数据切出 501 姓（单姓 438、复姓 63），原因是单姓集合漏了「归」「海」，
并把「商牟」「伯赏」按复姓切分。旧说明把差额归于「商牟、伯赏、第五」，这一说法有误，已更正。
现按通行计数（参见维基百科「百家姓」条）把「归海」「商牟」「伯赏」各拆为两个单姓，「第五」保留为复姓。需求方原希望「伯赏」保留为复姓，但这样最多只有 503 姓，
因此这项需求让位于通行本计数。每项调整都记在数据文件顶层 `sourceEdition.notes`；构建脚本会核对字数与 444 + 60，不符即报错。

### id 与 slug 的稳定性

`build-surnames-base.mjs` 以上一版 `base.json` 作登记表：已有条目（按简体 + 繁体匹配）沿用原 id 与 slug，次序变化也不重编。
因此第 473 位以后部分条目 id/slug 中的数字是首次发布时的次序，与 `order` 不一致（如第 480 位「后」为 `bjx-479-hou`、`/surnames/hou-479/`）。
只有新增条目按当前次序取 id/slug。本次新增：归 `bjx-471-gui`、海 `bjx-472-hai`、商 `bjx-487-shang`、牟 `bjx-488-mou`、伯 `bjx-491-bo`、赏 `bjx-492-shang`；
删除：`bjx-471-guihai`、`bjx-486-shangmou`、`bjx-489-boshang`。新增条目只有简繁与读音，其余字段为 `needs_source`。

## 顶层

```json
{ "version": "1.1.0", "title": "百家姓", "note": "…", "sourceEdition": SourceEdition, "surnames": [Surname, …] }
```

`sourceEdition`：`baseText`（底本，`{title, url, file}`）、`standardEdition`（所依通行本及计数出处，`{title, countReference, textReference}`）、
`notes`（string[]，逐条记录校对结果与每项切分调整）。

`surnames` 依原文次序排列。

## 共享字段（与 studio 约定一致）

| 字段 | 类型 | 说明 |
|---|---|---|
| `slug` | string | URL 用，如 `chen`；公开页 `/surnames/{slug}/`。同音时常见姓占用无后缀的 slug，其余为 `{拼音}-{次序}`（如 `liu-60` 为柳；次序为首次收录时的次序） |
| `name` | string | 简体姓氏 |
| `traditional` | string | 繁体 |
| `pinyin` | string | 姓氏读音，复姓连写（`Ōuyáng`） |
| `romanizations` | string[] | 新加坡常见拼法（Tan、Lim…），仅在有出处时填写 |
| `junwang` | string[] | 郡望 |
| `tanghao` | string[] | 堂号 |
| `origin` | string | 起源简述 |
| `migration` | string | 历史迁徙简述 |
| `generationPoems` | `{branch?: string, poem: string}[]` | 字辈。字辈属各支派，目前一律留空（`needs_source`） |
| `dialectGroups` | string[] | 新加坡相关方言群，仅在有出处时填写 |
| `clanAssociations` | string[] | 新加坡宗亲会馆正式名称 |
| `sources` | `{title: string, url?: string}[]` | 本条所有字段出处的去重汇总 |

空值一律为 `""` 或 `[]`，不会出现 `null`，studio 可直接按「空则跳过」处理。

## Additive fields

以下字段为本仓库新增，studio 可忽略：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 稳定编号 `bjx-{三位次序}-{无声调拼音}`，如 `bjx-001-zhao`；次序取首次收录时的次序，之后不变（见上文） |
| `order` | number | 原文次序，1 起 |
| `simplified` | string | 与 `name` 相同，便于语义明确的调用 |
| `isCompound` | boolean | 是否复姓 |
| `founder` | string | 得姓始祖（对应需求中的 `origin.founder`） |
| `nanyang` | string | 南来与新加坡情况（对应需求中的 `migration.nanyang`） |
| `notableFigures` | `{name: string, note: string}[]` | 历史人物 |
| `fieldSources` | `Record<field, {title: string, detail: string, url?: string}[]>` | 逐字段出处；`detail` 说明出处中的章节或依据 |
| `fieldStatus` | `Record<field, 'verified' \| 'needs_source'>` | 逐字段状态 |

`fieldStatus` / `fieldSources` 覆盖的字段：`traditional`、`pinyin`、`romanizations`、`junwang`、`tanghao`、`origin`、`founder`、`migration`、`nanyang`、`notableFigures`、`generationPoems`、`dialectGroups`、`clanAssociations`。

> 需求原稿中的 `origin {text, founder}`、`migration {text, nanyang}`、`zibei {text}` 为对象；为保持共享字段 `origin`/`migration` 为 string，改为平铺的 `founder`、`nanyang`，字辈使用共享字段 `generationPoems`。

### 状态规则（由 `validate-surnames.mjs` 强制）

- 字段**有内容** ⇒ `fieldStatus` 必须为 `verified`，且 `fieldSources` 至少一条（含 `title` 与 `detail`）。
- 字段**为空** ⇒ `fieldStatus` 必须为 `needs_source`，且无 `fieldSources`。
- 只收录能追溯到可引用出处的内容；不确定即留空，不推测、不夸大。

## Studio 自动填写建议

- 第 2 步「姓氏渊源」：`origin`、`founder`、`junwang`、`tanghao`，并附 `fieldSources` 中对应条目作为出处。
- 第 3 步「祖辈迁徙」：`migration`、`nanyang`。
- 第 4 步「籍贯文化」：`tanghao`、`dialectGroups`、`clanAssociations`。
- 仅在 `fieldStatus[field] === 'verified'` 时预填；`needs_source` 的字段保持空白，提示会员填写家中所知。
- 以 `name` 查找时注意两组同形异姓：第 181 位「郁」与第 284 位「郁（鬱）」、第 398 位「后（後）」与第 480 位「后」（`bjx-479-hou`）；请以 `id` 或 `slug` 区分。
