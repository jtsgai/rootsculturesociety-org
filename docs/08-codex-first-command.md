# First Codex command (paste in full)

Use this as the first message in a new Codex session. Do not shorten it.

---

你在本机工作。GitHub 仓库是 `jtsgai/rootsculturesociety-org`（私有）。先 clone 或 pull 到最新 `main`。

开始写代码之前，必须依序读完这些文件并在回复里列出文件名以证明读过：
- docs/01-locked-decisions.md
- docs/02-site-map.md
- docs/03-studio-fields.md
- docs/04-admin-flow.md
- docs/05-homepage-copy.md
- docs/06-logo-note.md
- docs/07-codex-brief.md
- README.md

读完之后再开工。不要问我要不要做；按下面规格直接做。

## 这一轮只做什么

公共馆：中英双语官网静态页。不做登录、数据库、收款、谱坊、AI 生成接口。

## 工程起点

用 AstroWind 做脚手架：https://github.com/onwidget/astrowind
Astro 7 + Tailwind CSS 4。演示站 https://astrowind.vercel.app/ 只能当结构参考，禁止保留其创业公司外观。

把项目落在本仓库根目录。保留 `docs/`，不要删规格文档。

改掉或删掉 AstroWind 默认的：蓝紫渐变、Get started 免费、定价表、客户 Logo 墙、假评语、新闻信弹窗、SaaS 功能区。

## 组织与联络（不得改写）

- 中文名：新加坡根缘文化学会
- 英文名：Roots Culture Society of Singapore
- UEN：T17SS0170F
- 通讯处：95 Jalan Lokam, Singapore 537915
- 域名：rootsculturesociety.org（先本地预览）
- 公开联络只有：秘书长 ianchungcy@gmail.com ，WhatsApp 9272 8933
- 入会页只写：请 WhatsApp 秘书长办理入会。年费 S$99，不含印刷成书，网站不收款。
- 页脚可写注册于 2017

## 页面（中英都要）

中文在 `/`，英文在 `/en/`，每页有语言切换。

/、/about、/committee、/method、/publications、/stories、/events、/membership、/links、/privacy、/terms、/contact
对应英文加 `/en/` 前缀。

首页文案必须使用 docs/05-homepage-copy.md 的中英原文，不要改写主张句。

寻根路径页链接：
- https://www.roots.gov.sg/
- https://www.nas.gov.sg/
- https://www.nlb.gov.sg/
- https://www.singaporeccc.org.sg/
- https://sfcca.sg/

隐私页按对话中已定的 PDPA 要点写短版：学会主体、不收 NRIC、谱坊默认私密（谱坊本期未上线也要写清楚是未来功能）、联络秘书长。

## 设计

气质对标：https://www.nordiskamuseet.se/en/ 和 https://www.heide.com.au/
禁止：祭祀红金边、祥云、自动轮播 Banner、卡通图标三列、SaaS 蓝紫渐变。

色彩：底 #F6F1EA，字 #1A1412，点缀 #8B1A1A。
中文标题 Noto Serif SC，正文 Noto Sans SC；英文标题衬线，界面无衬线。
Logo 放 `public/brand/RCSSLogo.png`。若本机资料夹有 `/Users/apple/Library/Mobile Documents/com~apple~CloudDocs/锺博士/根缘文化/网站资料/RCSSLogo.png`，拷进仓库后裁成圆形、去掉黑底。不要把黑色画布当会徽一起上页眉。

有书封原图用原图（`2025年出版.jpeg`、`2026年出版.jpeg`）。没有的氛围图可以生成：纸、树根、旧街、家桌、手稿质感。禁止生成具名祖先肖像，禁止公开 `锺开增 样本.pdf` 里的家庭照片与姓名地址表。

## 执委会

只上姓名与职务，不上个人电话（秘书长联络放联络页）：
会长 陈业雄；副会长 锺瑞忠；财务长 陈泽南；秘书长 锺骏源；助理秘书长 拓劲涛；委员 蔡岑宗。

## 验收

- npm run dev 和 npm run build 都能过
- 手机导航可用
- 每页中英可切
- 不剩 AstroWind 演示文案（如「Your App」、假公司名、假客户）
- 在 README 写清本地启动命令

做完后给出：改了哪些路径、如何 npm run dev、还缺哪些原图。
